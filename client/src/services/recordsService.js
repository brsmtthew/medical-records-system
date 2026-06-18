import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/firebaseClient";
import { sortNewestFirst } from "@shared/utils/recordSorting";
import { sanitizeRecordPayload, sanitizeText } from "@shared/utils/security";
import { allUserRoles, medicalRecordsRoles, normalizeUserRole, userRoles } from "@shared/constants/userRoles";
import { assertChartRequestTransition } from "@shared/utils/workflowGuards";

export const recordsUnavailableMessage = "Firebase database is not configured.";
export const fallbackDepartments = [
  "Medical Records",
  "Emergency Room",
  "Internal Medicine",
  "Surgery",
  "Billing",
  "Laboratory",
  "Radiology",
  "Nursing Station",
];
export const fallbackAdmissionLocations = [
  "Nurse Station",
  "Emergency",
  "NICU",
  "MICU",
];
export const fallbackOutpatientDepartments = [
  "RDU",
  "OR",
  "ONCO",
  "ENDOSCOPY",
];
export const duplicateCaseNumberMessage = "A patient with this case number already exists.";
export const duplicatePatientStayMessage = "This inpatient record overlaps a previous inpatient admission period.";
export const patientBeforeFirstRecordMessage = "Readmission date cannot be earlier than this patient's first hospital record.";

const patientSnapshotCollections = [
  "chartLogs",
  "chartRequests",
  "medicalDocumentRequests",
  "labResultRequests",
  "vitalCertificateRequests",
];

let activeUserProfile = null;

// AuthProvider keeps this profile live; CRUD calls reuse it so each write does not
// first wait on an extra user-document read.
export function syncActiveUserProfile(profile) {
  activeUserProfile = profile?.uid ? profile : null;
}

export function getActiveUserProfile(userId) {
  return activeUserProfile?.uid === userId ? activeUserProfile : null;
}

function isActiveProfile(profile = {}) {
  return !["disabled", "deleted", "missing"].includes(profile.accountStatus || "active");
}

// Returns the configured Firestore instance or fails fast with a user-facing setup message.
function requireDb() {
  if (!db) {
    throw new Error(recordsUnavailableMessage);
  }
  return db;
}

export async function requireActiveRole({ adminOnly = false, roles = medicalRecordsRoles } = {}) {
  const database = requireDb();
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Sign in again before making this change.");
  }

  let profile = activeUserProfile?.uid === user.uid ? activeUserProfile : null;
  if (!profile) {
    const profileSnapshot = await getDoc(doc(database, "users", user.uid));
    profile = profileSnapshot.exists() ? { uid: user.uid, ...profileSnapshot.data() } : {};
  }
  const isActive = isActiveProfile(profile);
  const role = normalizeUserRole(profile.role);

  if (!isActive) {
    throw new Error("This account is not active.");
  }
  if (adminOnly && role !== userRoles.admin) {
    throw new Error("Administrator access is required for this action.");
  }
  if (!adminOnly && roles.length > 0 && !roles.includes(role)) {
    throw new Error("Medical Records access is required for this action.");
  }

  return { user, profile, role };
}

// Converts Firestore snapshots into plain rows with their document ids attached.
function snapshotRows(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

// Keeps editable department lists alphabetized.
function sortByName(rows) {
  return [...rows].sort((first, second) => String(first.name || "").localeCompare(String(second.name || "")));
}

// Keeps user access rows sorted by display name or email.
function sortByUserName(rows) {
  return [...rows].sort((first, second) => {
    const firstName = first.fullName || first.displayName || first.email || "";
    const secondName = second.fullName || second.displayName || second.email || "";
    return String(firstName).localeCompare(String(secondName));
  });
}

// Normalizes patient stay dates and names before admission overlap checks.
function normalizePatientStay(patient) {
  const admissionDate = patient.admissionDate || "";
  const dischargeDate = patient.type === "outpatient"
    ? admissionDate
    : patient.dischargeDate || "";

  return {
    name: String(patient.name || "").trim().replace(/\s+/g, " ").toUpperCase(),
    admissionDate,
    dischargeDate,
  };
}

// Cleans department names before storing them in Firestore.
function sanitizeDepartmentName(name) {
  return sanitizeText(name, { maxLength: 120, uppercase: true });
}

// Cleans patient form data before creating or updating patient/chart documents.
function sanitizePatientPayload(patient) {
  return sanitizeRecordPayload(patient, {
    caseNumber: { maxLength: 60, uppercase: true },
    name: { maxLength: 160, uppercase: true },
    type: { maxLength: 30 },
    recordType: { maxLength: 30 },
    department: { maxLength: 120, uppercase: true },
    attendingDoctorId: { maxLength: 120 },
    attendingDoctorName: { maxLength: 160 },
    attendingDoctorClinic: { maxLength: 120 },
    admissionDate: { maxLength: 20 },
    dischargeDate: { maxLength: 20 },
  });
}

// Cleans chart update fields before writing circulation state.
function sanitizeChartPayload(chart) {
  return sanitizeRecordPayload(chart, {
    caseNumber: { maxLength: 60, uppercase: true },
    patientName: { maxLength: 160, uppercase: true },
    patientDepartment: { maxLength: 120, uppercase: true },
    attendingDoctorId: { maxLength: 120 },
    attendingDoctorName: { maxLength: 160 },
    attendingDoctorClinic: { maxLength: 120 },
    recordType: { maxLength: 30 },
    patientType: { maxLength: 30 },
    admissionDate: { maxLength: 20 },
    dischargeDate: { maxLength: 20 },
    status: { maxLength: 30 },
    borrower: { maxLength: 160 },
    borrowerId: { maxLength: 120 },
    department: { maxLength: 120, uppercase: true },
    borrowedAt: { maxLength: 40 },
    dueDate: { maxLength: 40 },
    activeLogId: { maxLength: 120 },
  });
}

// Cleans audit log fields before writing report rows.
function sanitizeChartLogPayload(log) {
  return sanitizeRecordPayload(log, {
    caseNumber: { maxLength: 60, uppercase: true },
    patientName: { maxLength: 160, uppercase: true },
    borrowedBy: { maxLength: 160 },
    requestedById: { maxLength: 120 },
    returnedBy: { maxLength: 160 },
    department: { maxLength: 120, uppercase: true },
    action: { maxLength: 30 },
    remarks: { maxLength: 500 },
    borrowedAt: { maxLength: 40 },
    returnedAt: { maxLength: 40 },
    canceledAt: { maxLength: 40 },
  });
}

// Cleans audit action fields before storing staff activity history.
function sanitizeAuditLogPayload(log) {
  return sanitizeRecordPayload(log, {
    type: { maxLength: 30 },
    title: { maxLength: 120 },
    message: { maxLength: 500 },
    patientName: { maxLength: 160, uppercase: true },
    caseNumber: { maxLength: 60, uppercase: true },
    action: { maxLength: 120 },
    userName: { maxLength: 160 },
    userEmail: { maxLength: 254 },
    userId: { maxLength: 120 },
  });
}

// Cleans account-control changes before updating a user profile document.
function sanitizeUserAccessPayload(updates) {
  const safeUpdates = sanitizeRecordPayload(updates, {
    role: { maxLength: 30 },
    accountStatus: { maxLength: 30 },
    department: { maxLength: 120, uppercase: true },
    clinic: { maxLength: 120 },
    specialty: { maxLength: 120 },
    licenseNumber: { maxLength: 80, uppercase: true },
    position: { maxLength: 120 },
    restrictionReason: { maxLength: 300 },
  });

  if (safeUpdates.role && !allUserRoles.includes(safeUpdates.role)) {
    throw new Error("Role must be admin, staff, nurse, or doctor.");
  }

  return safeUpdates;
}

// Cleans targeted bell notifications exchanged between clinical users and Records staff.
function sanitizeUserNotificationPayload(notification) {
  return sanitizeRecordPayload(notification, {
    type: { maxLength: 30 },
    title: { maxLength: 120 },
    message: { maxLength: 500 },
    patientName: { maxLength: 160, uppercase: true },
    caseNumber: { maxLength: 60, uppercase: true },
    action: { maxLength: 120 },
    sourceUserId: { maxLength: 120 },
    sourceUserName: { maxLength: 160 },
    targetUserId: { maxLength: 120 },
    targetRole: { maxLength: 60 },
    targetPath: { maxLength: 200 },
  });
}

// Cleans online chart request rows from clinical users and Records staff.
function sanitizeChartRequestPayload(request) {
  return sanitizeRecordPayload(request, {
    caseNumber: { maxLength: 60, uppercase: true },
    patientName: { maxLength: 160, uppercase: true },
    requestedBy: { maxLength: 160 },
    requestedByEmail: { maxLength: 254 },
    requestedByRole: { maxLength: 30 },
    requestedByDepartment: { maxLength: 120, uppercase: true },
    requestedByClinic: { maxLength: 120 },
    purpose: { maxLength: 300 },
    priority: { maxLength: 30 },
    status: { maxLength: 30 },
    reviewedAt: { maxLength: 40 },
    preparedBy: { maxLength: 160 },
    preparedAt: { maxLength: 40 },
    readyAt: { maxLength: 40 },
    receivedAt: { maxLength: 40 },
    borrowedAt: { maxLength: 40 },
    returnedAt: { maxLength: 40 },
    returnReceivedAt: { maxLength: 40 },
    completedAt: { maxLength: 40 },
    canceledAt: { maxLength: 40 },
    activeLogId: { maxLength: 120 },
    remarks: { maxLength: 500 },
  });
}

// Converts date inputs into comparable timestamps.
function dateValue(value) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

// Checks whether two inpatient stays overlap.
function patientStayOverlaps(firstPatient, secondPatient) {
  if (firstPatient.type !== "inpatient" || secondPatient.type !== "inpatient") {
    return false;
  }

  const first = normalizePatientStay(firstPatient);
  const second = normalizePatientStay(secondPatient);
  const firstAdmission = dateValue(first.admissionDate);
  const firstDischarge = dateValue(first.dischargeDate || first.admissionDate);
  const secondAdmission = dateValue(second.admissionDate);
  const secondDischarge = dateValue(second.dischargeDate || second.admissionDate);

  if (!firstAdmission || !firstDischarge || !secondAdmission || !secondDischarge) return false;

  return firstAdmission <= secondDischarge && secondAdmission <= firstDischarge;
}

// Prevents new or edited readmission dates from predating the first known record.
function patientAdmissionBeforeFirstRecordExistsInRows(patientRows, patient, ignoredCaseNumber = "") {
  const candidate = normalizePatientStay(patient);
  const candidateAdmission = dateValue(candidate.admissionDate);
  if (!candidate.name || !candidateAdmission) return false;

  const firstExistingAdmission = patientRows
    .filter((row) => !ignoredCaseNumber || row.id !== ignoredCaseNumber)
    .map((row) => dateValue(row.admissionDate))
    .filter(Boolean)
    .sort((first, second) => first - second)[0];

  return Boolean(firstExistingAdmission && candidateAdmission < firstExistingAdmission);
}

async function matchingPatientRows(database, patient) {
  const candidate = normalizePatientStay(patient);
  if (!candidate.name) return [];

  const patientRows = await getDocs(
    query(collection(database, "patients"), where("name", "==", candidate.name)),
  );

  return snapshotRows(patientRows);
}

async function patientAdmissionBeforeFirstRecordExists(database, patient, ignoredCaseNumber = "") {
  return patientAdmissionBeforeFirstRecordExistsInRows(
    await matchingPatientRows(database, patient),
    patient,
    ignoredCaseNumber,
  );
}

async function commitBatchedUpdates(database, updates) {
  for (let index = 0; index < updates.length; index += 450) {
    const batch = writeBatch(database);
    updates.slice(index, index + 450).forEach(({ ref, payload }) => {
      batch.update(ref, payload);
    });
    await batch.commit();
  }
}

async function syncPatientSnapshotRows(database, previousCaseNumber, safePatient) {
  const nextCaseNumber = safePatient.caseNumber;
  const nextPatientName = safePatient.name;
  const snapshots = await Promise.all(
    patientSnapshotCollections.map((collectionName) => (
      getDocs(query(collection(database, collectionName), where("caseNumber", "==", previousCaseNumber)))
    )),
  );
  const updates = [];

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((rowSnapshot) => {
      const row = rowSnapshot.data();
      if (row.caseNumber === nextCaseNumber && row.patientName === nextPatientName) return;

      updates.push({
        ref: rowSnapshot.ref,
        payload: {
          caseNumber: nextCaseNumber,
          patientName: nextPatientName,
          updatedAt: serverTimestamp(),
        },
      });
    });
  });

  await commitBatchedUpdates(database, updates);
}

// Checks Firestore for an existing inpatient stay that overlaps the candidate row.
function overlappingPatientStayExistsInRows(patientRows, patient, ignoredCaseNumber = "") {
  const candidate = normalizePatientStay(patient);
  if (!candidate.name || !candidate.admissionDate) return false;

  return patientRows.some((patientRow) => {
    if (ignoredCaseNumber && patientRow.id === ignoredCaseNumber) return false;

    const row = normalizePatientStay(patientRow);
    return (
      row.name === candidate.name &&
      patientStayOverlaps(row, candidate)
    );
  });
}

async function overlappingPatientStayExists(database, patient, ignoredCaseNumber = "") {
  return overlappingPatientStayExistsInRows(
    await matchingPatientRows(database, patient),
    patient,
    ignoredCaseNumber,
  );
}

// Streams patient rows sorted by most recent activity.
export function subscribeToPatients(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "patients"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

// Streams chart rows sorted by most recent activity.
export function subscribeToCharts(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "charts"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

// Streams chart audit logs sorted by most recent activity.
export function subscribeToChartLogs(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "chartLogs"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

// Streams chart requests for clinical users and Medical Records staff.
export function subscribeToChartRequests(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  const user = auth?.currentUser;
  const role = normalizeUserRole(activeUserProfile?.role);
  const requestQuery = user && !medicalRecordsRoles.includes(role)
    ? query(collection(db, "chartRequests"), where("requestedById", "==", user.uid))
    : collection(db, "chartRequests");

  return onSnapshot(requestQuery, (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

// Streams departments used by chart borrowing.
export function subscribeToDepartments(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => !["admissionLocation", "outpatientDepartment"].includes(row.type))));
  }, onError);
}

// Streams departments used as inpatient admission locations.
export function subscribeToAdmissionLocations(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => row.type === "admissionLocation")));
  }, onError);
}

// Streams departments used by outpatient registration.
export function subscribeToOutpatientDepartments(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => row.type === "outpatientDepartment")));
  }, onError);
}

// Streams user profiles for admin account monitoring and staff access control.
export function subscribeToUsers(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "users"), (snapshot) => {
    onRows(sortByUserName(snapshotRows(snapshot)));
  }, onError);
}

// Streams active doctor profiles for attending-physician dropdowns.
export function subscribeToDoctors(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, "users"), where("role", "==", userRoles.doctor)), (snapshot) => {
    onRows(sortByUserName(snapshotRows(snapshot).filter((row) => row.accountStatus !== "disabled")));
  }, onError);
}

// Streams centralized audit actions so admins can review staff activity across workstations.
export function subscribeToAuditLogs(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "auditLogs"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

// Adds a chart borrowing department.
export async function addDepartment(name) {
  const database = requireDb();
  await requireActiveRole();
  const departmentName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: departmentName,
    type: "chartDepartment",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Renames a chart borrowing department.
export async function updateDepartment(id, name) {
  const database = requireDb();
  await requireActiveRole();
  const departmentName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: departmentName,
    updatedAt: serverTimestamp(),
  });
}

// Deletes a chart borrowing department.
export async function deleteDepartment(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await deleteDoc(doc(database, "departments", id));
}

// Adds an inpatient admission location.
export async function addAdmissionLocation(name) {
  const database = requireDb();
  await requireActiveRole();
  const locationName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: locationName,
    type: "admissionLocation",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Renames an inpatient admission location.
export async function updateAdmissionLocation(id, name) {
  const database = requireDb();
  await requireActiveRole();
  const locationName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: locationName,
    type: "admissionLocation",
    updatedAt: serverTimestamp(),
  });
}

// Deletes an inpatient admission location.
export async function deleteAdmissionLocation(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await deleteDoc(doc(database, "departments", id));
}

// Adds an outpatient department.
export async function addOutpatientDepartment(name) {
  const database = requireDb();
  await requireActiveRole();
  const departmentName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: departmentName,
    type: "outpatientDepartment",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Renames an outpatient department.
export async function updateOutpatientDepartment(id, name) {
  const database = requireDb();
  await requireActiveRole();
  const departmentName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: departmentName,
    type: "outpatientDepartment",
    updatedAt: serverTimestamp(),
  });
}

// Deletes an outpatient department.
export async function deleteOutpatientDepartment(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await deleteDoc(doc(database, "departments", id));
}

// Updates a user's role, account status, or restriction reason from the admin panel.
export async function updateUserAccess(userId, updates) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await updateDoc(doc(database, "users", userId), {
    ...sanitizeUserAccessPayload(updates),
    updatedAt: serverTimestamp(),
  });
}

// Removes a user profile from the admin user list. The matching Firebase Auth
// account can no longer enter because sign-in now requires an existing profile.
export async function deleteUserProfile(userId) {
  const database = requireDb();
  const { user } = await requireActiveRole({ adminOnly: true });
  if (user.uid === userId) {
    throw new Error("You cannot delete your own signed-in account.");
  }

  await deleteDoc(doc(database, "users", userId));
}

// Creates a patient and its matching available chart document.
export async function createPatient(patient) {
  const database = requireDb();
  await requireActiveRole();
  const safePatient = sanitizePatientPayload(patient);
  const patientRef = doc(database, "patients", safePatient.caseNumber);
  const chartRef = doc(database, "charts", safePatient.caseNumber);
  const now = serverTimestamp();
  const [patientSnapshot, chartSnapshot, matchingRows] = await Promise.all([
    getDoc(patientRef),
    getDoc(chartRef),
    matchingPatientRows(database, safePatient),
  ]);

  if (patientSnapshot.exists() || chartSnapshot.exists()) {
    throw new Error(duplicateCaseNumberMessage);
  }

  if (overlappingPatientStayExistsInRows(matchingRows, safePatient)) {
    throw new Error(duplicatePatientStayMessage);
  }
  if (patientAdmissionBeforeFirstRecordExistsInRows(matchingRows, safePatient)) {
    throw new Error(patientBeforeFirstRecordMessage);
  }

  const batch = writeBatch(database);
  batch.set(patientRef, {
    ...safePatient,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(chartRef, {
    caseNumber: safePatient.caseNumber,
    patientName: safePatient.name,
    patientDepartment: safePatient.department || "",
    attendingDoctorId: safePatient.attendingDoctorId || "",
    attendingDoctorName: safePatient.attendingDoctorName || "",
    attendingDoctorClinic: safePatient.attendingDoctorClinic || "",
    recordType: safePatient.recordType || "new",
    patientType: safePatient.type || "outpatient",
    admissionDate: safePatient.admissionDate || "",
    dischargeDate: safePatient.dischargeDate || "",
    status: "available",
    borrower: "",
    department: "",
    borrowedAt: "",
    dueDate: "",
    history: [
      {
        action: "checkin",
        borrower: "System",
        department: "Medical Records",
        date: new Date().toISOString(),
      },
    ],
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();
}

// Updates patient details and keeps the linked chart document in sync.
export async function updatePatient(previousCaseNumber, patient) {
  const database = requireDb();
  const { user } = await requireActiveRole();
  const now = serverTimestamp();
  const safePatient = sanitizePatientPayload(patient);

  if (previousCaseNumber !== safePatient.caseNumber) {
    const previousChartRef = doc(database, "charts", previousCaseNumber);
    const nextPatientRef = doc(database, "patients", safePatient.caseNumber);
    const nextChartRef = doc(database, "charts", safePatient.caseNumber);
    const [previousChartSnapshot, nextPatientSnapshot, nextChartSnapshot] = await Promise.all([
      getDoc(previousChartRef),
      getDoc(nextPatientRef),
      getDoc(nextChartRef),
    ]);

    if (nextPatientSnapshot.exists() || nextChartSnapshot.exists()) {
      throw new Error(duplicateCaseNumberMessage);
    }

    if (await overlappingPatientStayExists(database, safePatient, previousCaseNumber)) {
      throw new Error(duplicatePatientStayMessage);
    }
    if (await patientAdmissionBeforeFirstRecordExists(database, safePatient, previousCaseNumber)) {
      throw new Error(patientBeforeFirstRecordMessage);
    }

    const previousChart = previousChartSnapshot.exists() ? previousChartSnapshot.data() : {};

    const createBatch = writeBatch(database);
    createBatch.set(nextPatientRef, {
      ...safePatient,
      previousCaseNumber,
      renamePendingBy: user.uid,
      createdAt: safePatient.createdAt || now,
      updatedAt: now,
    });

    createBatch.set(nextChartRef, {
      ...previousChart,
      caseNumber: safePatient.caseNumber,
      previousCaseNumber,
      renamePendingBy: user.uid,
      patientName: safePatient.name,
      patientDepartment: safePatient.department || "",
      attendingDoctorId: safePatient.attendingDoctorId || "",
      attendingDoctorName: safePatient.attendingDoctorName || "",
      attendingDoctorClinic: safePatient.attendingDoctorClinic || "",
      recordType: safePatient.recordType || "new",
      patientType: safePatient.type || "outpatient",
      admissionDate: safePatient.admissionDate || "",
      dischargeDate: safePatient.dischargeDate || "",
      status: previousChart.status || "available",
      borrower: previousChart.borrower || "",
      department: previousChart.department || "",
      borrowedAt: previousChart.borrowedAt || "",
      dueDate: previousChart.dueDate || "",
      activeLogId: previousChart.activeLogId || "",
      history: previousChart.history || [
        {
          action: "checkin",
          borrower: "System",
          department: "Medical Records",
          date: new Date().toISOString(),
        },
      ],
      createdAt: previousChart.createdAt || now,
      updatedAt: now,
    });
    await createBatch.commit();

    if (previousChart.activeLogId) {
      await updateChartLogIfExists(previousChart.activeLogId, {
        patientName: safePatient.name,
        caseNumber: safePatient.caseNumber,
      });
    }

    await syncPatientSnapshotRows(database, previousCaseNumber, safePatient);

    const markRenameBatch = writeBatch(database);
    markRenameBatch.update(doc(database, "patients", previousCaseNumber), {
      renamePendingBy: user.uid,
      renamePendingTo: safePatient.caseNumber,
      updatedAt: now,
    });
    markRenameBatch.update(previousChartRef, {
      renamePendingBy: user.uid,
      renamePendingTo: safePatient.caseNumber,
      updatedAt: now,
    });
    await markRenameBatch.commit();

    const deleteBatch = writeBatch(database);
    deleteBatch.delete(doc(database, "patients", previousCaseNumber));
    deleteBatch.delete(previousChartRef);
    await deleteBatch.commit();
    return;
  }

  if (await overlappingPatientStayExists(database, safePatient, previousCaseNumber)) {
    throw new Error(duplicatePatientStayMessage);
  }
  if (await patientAdmissionBeforeFirstRecordExists(database, safePatient, previousCaseNumber)) {
    throw new Error(patientBeforeFirstRecordMessage);
  }

  const batch = writeBatch(database);
  batch.update(doc(database, "patients", safePatient.caseNumber), {
    ...safePatient,
    updatedAt: now,
  });

  batch.update(doc(database, "charts", safePatient.caseNumber), {
    patientName: safePatient.name,
    patientDepartment: safePatient.department || "",
    attendingDoctorId: safePatient.attendingDoctorId || "",
    attendingDoctorName: safePatient.attendingDoctorName || "",
    attendingDoctorClinic: safePatient.attendingDoctorClinic || "",
    recordType: safePatient.recordType || "new",
    patientType: safePatient.type || "outpatient",
    admissionDate: safePatient.admissionDate || "",
    dischargeDate: safePatient.dischargeDate || "",
    updatedAt: now,
  });
  await batch.commit();
  await syncPatientSnapshotRows(database, safePatient.caseNumber, safePatient);
}

// Deletes a patient and cancels active borrow logs tied to its chart.
export async function deletePatient(caseNumber) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  const chartRef = doc(database, "charts", caseNumber);
  const chartSnapshot = await getDoc(chartRef);
  const chart = chartSnapshot.exists() ? chartSnapshot.data() : null;
  const cancellationTime = new Date().toISOString();
  const voidedTransactionUpdate = {
    releaseStatus: "voided",
    remarks: "Patient was deleted. All related transactions were voided.",
    voidedAt: cancellationTime,
    updatedAt: serverTimestamp(),
  };
  const trackingCollections = [
    "medicalDocumentRequests",
    "labResultRequests",
    "vitalCertificateRequests",
  ];
  const trackingSnapshots = await Promise.all(
    trackingCollections.map((collectionName) => (
      getDocs(query(collection(database, collectionName), where("caseNumber", "==", caseNumber)))
    )),
  );

  const addVoidedTrackingUpdates = (batch) => {
    trackingCollections.forEach((collectionName, index) => {
      trackingSnapshots[index].docs.forEach((trackingSnapshot) => {
        batch.update(doc(database, collectionName, trackingSnapshot.id), voidedTransactionUpdate);
      });
    });
  };

  if (chart?.status === "borrowed") {
    const cancelledLogUpdate = {
      action: "canceled",
      canceledAt: cancellationTime,
      returnedAt: "",
      remarks: "Patient data was deleted while this chart was borrowed. Borrowing was canceled.",
      updatedAt: serverTimestamp(),
    };

    const borrowedLogsSnapshot = await getDocs(
      query(
        collection(database, "chartLogs"),
        where("caseNumber", "==", caseNumber),
        where("action", "==", "borrowed"),
      ),
    );

    const batch = writeBatch(database);
    borrowedLogsSnapshot.docs.forEach((logSnapshot) => {
      batch.update(doc(database, "chartLogs", logSnapshot.id), cancelledLogUpdate);
    });
    addVoidedTrackingUpdates(batch);
    batch.delete(doc(database, "patients", caseNumber));
    batch.delete(chartRef);

    if (chart.activeLogId && !borrowedLogsSnapshot.docs.some((logSnapshot) => logSnapshot.id === chart.activeLogId)) {
      await updateChartLogIfExists(chart.activeLogId, cancelledLogUpdate);
    }

    await batch.commit();
    return;
  }

  const batch = writeBatch(database);
  addVoidedTrackingUpdates(batch);
  batch.delete(doc(database, "patients", caseNumber));
  batch.delete(chartRef);
  await batch.commit();
}

// Updates chart circulation fields for borrow and return workflows.
export async function updateChart(caseNumber, updates) {
  const database = requireDb();
  await requireActiveRole();
  await updateDoc(doc(database, "charts", caseNumber), {
    ...sanitizeChartPayload(updates),
    updatedAt: serverTimestamp(),
  });
}

// Atomically checks out a chart so two workstations cannot borrow the same folder.
export async function checkoutChart(caseNumber, log, updates) {
  const database = requireDb();
  await requireActiveRole();
  const safeCaseNumber = sanitizeText(caseNumber, { maxLength: 60, uppercase: true });
  const chartRef = doc(database, "charts", safeCaseNumber);
  const logRef = doc(collection(database, "chartLogs"));
  const safeLog = sanitizeChartLogPayload(log);
  const safeUpdates = sanitizeChartPayload(updates);

  await runTransaction(database, async (transaction) => {
    const chartSnapshot = await transaction.get(chartRef);
    if (!chartSnapshot.exists()) {
      throw new Error("No chart found for that case number.");
    }

    const chart = chartSnapshot.data();
    if (chart.status === "borrowed") {
      throw new Error("This chart is already borrowed.");
    }

    transaction.set(logRef, {
      ...safeLog,
      caseNumber: safeCaseNumber,
      createdAt: serverTimestamp(),
    });
    transaction.update(chartRef, {
      ...safeUpdates,
      caseNumber: safeCaseNumber,
      status: "borrowed",
      activeLogId: logRef.id,
      updatedAt: serverTimestamp(),
    });
  });

  return logRef.id;
}

// Atomically checks in a chart and closes or recreates the matching borrow log.
export async function returnChart(caseNumber, returnedLog, updates) {
  const database = requireDb();
  await requireActiveRole();
  const safeCaseNumber = sanitizeText(caseNumber, { maxLength: 60, uppercase: true });
  const chartRef = doc(database, "charts", safeCaseNumber);
  const safeReturnedLog = sanitizeChartLogPayload(returnedLog);
  const safeUpdates = sanitizeChartPayload(updates);

  return runTransaction(database, async (transaction) => {
    const chartSnapshot = await transaction.get(chartRef);
    if (!chartSnapshot.exists()) {
      throw new Error("No chart found for that case number.");
    }

    const chart = chartSnapshot.data();
    if (chart.status !== "borrowed") {
      throw new Error("This chart is already available.");
    }

    let recreatedReturnLog = false;
    if (chart.activeLogId) {
      const logRef = doc(database, "chartLogs", chart.activeLogId);
      const logSnapshot = await transaction.get(logRef);

      if (logSnapshot.exists()) {
        transaction.update(logRef, {
          ...safeReturnedLog,
          caseNumber: safeCaseNumber,
          updatedAt: serverTimestamp(),
        });
      } else {
        const replacementLogRef = doc(collection(database, "chartLogs"));
        transaction.set(replacementLogRef, {
          ...safeReturnedLog,
          caseNumber: safeCaseNumber,
          remarks: safeReturnedLog.remarks || "Chart returned after borrowed report row was deleted",
          createdAt: serverTimestamp(),
        });
        recreatedReturnLog = true;
      }
    } else {
      const logRef = doc(collection(database, "chartLogs"));
      transaction.set(logRef, {
        ...safeReturnedLog,
        caseNumber: safeCaseNumber,
        createdAt: serverTimestamp(),
      });
      recreatedReturnLog = true;
    }

    transaction.update(chartRef, {
      ...safeUpdates,
      caseNumber: safeCaseNumber,
      status: "available",
      activeLogId: "",
      updatedAt: serverTimestamp(),
    });

    return { recreatedReturnLog };
  });
}

// Adds a new chart audit log and returns its id for active-borrow linking.
export async function addChartLog(log) {
  const database = requireDb();
  await requireActiveRole();
  const logRef = await addDoc(collection(database, "chartLogs"), {
    ...sanitizeChartLogPayload(log),
    createdAt: serverTimestamp(),
  });
  return logRef.id;
}

// Updates a chart audit log by id.
export async function updateChartLog(id, log) {
  const database = requireDb();
  await requireActiveRole();
  await updateDoc(doc(database, "chartLogs", id), {
    ...sanitizeChartLogPayload(log),
    updatedAt: serverTimestamp(),
  });
}

// Updates an audit log only when it still exists.
export async function updateChartLogIfExists(id, log) {
  const database = requireDb();
  await requireActiveRole();
  const logRef = doc(database, "chartLogs", id);
  const logSnapshot = await getDoc(logRef);
  if (!logSnapshot.exists()) return false;

  await updateDoc(logRef, {
    ...sanitizeChartLogPayload(log),
    updatedAt: serverTimestamp(),
  });
  return true;
}

// Streams bell notifications targeted to the signed-in user or Medical Records group.
export function subscribeToUserNotifications(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  const user = auth?.currentUser;
  if (!user) {
    onRows([]);
    return () => {};
  }

  const role = normalizeUserRole(activeUserProfile?.role);
  const notificationQuery = medicalRecordsRoles.includes(role)
    ? query(collection(db, "userNotifications"), where("targetRole", "==", "medicalRecords"))
    : query(collection(db, "userNotifications"), where("targetUserId", "==", user.uid));

  return onSnapshot(notificationQuery, (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

async function addUserNotification(notification) {
  const database = requireDb();
  const user = auth?.currentUser;
  if (!user) return;

  await addDoc(collection(database, "userNotifications"), {
    ...sanitizeUserNotificationPayload({
      type: "info",
      sourceUserId: user.uid,
      ...notification,
    }),
    createdAt: serverTimestamp(),
  });
}

function requesterDisplayName(name, role) {
  const safeName = String(name || "").trim();
  if (role === userRoles.doctor && safeName && !safeName.toUpperCase().startsWith("DR.")) {
    return `DR. ${safeName}`;
  }
  return safeName;
}

// Adds a clinical chart request without releasing the physical chart until Records marks it ready.
export async function addChartRequest(request) {
  const database = requireDb();
  const { user, profile, role } = await requireActiveRole({ roles: allUserRoles });
  const safeRequest = sanitizeChartRequestPayload(request);
  const safeCaseNumber = sanitizeText(safeRequest.caseNumber, { maxLength: 60, uppercase: true });
  const requestedBy = requesterDisplayName(
    safeRequest.requestedBy || profile.fullName || profile.displayName || user.displayName || user.email || "",
    role,
  );
  const requestRef = doc(collection(database, "chartRequests"));
  const chartRef = doc(database, "charts", safeCaseNumber);
  const requestChecks = medicalRecordsRoles.includes(role)
    ? [where("caseNumber", "==", safeCaseNumber)]
    : [where("requestedById", "==", user.uid), where("caseNumber", "==", safeCaseNumber)];
  const activeRequestSnapshot = await getDocs(query(collection(database, "chartRequests"), ...requestChecks));
  const hasActiveRequest = activeRequestSnapshot.docs.some((requestSnapshot) => {
    const status = requestSnapshot.data().status || "pending";
    return !["completed", "canceled"].includes(status);
  });

  if (hasActiveRequest) {
    throw new Error(medicalRecordsRoles.includes(role)
      ? "This chart already has an active request in process."
      : "You already have an active request for this chart.");
  }

  await runTransaction(database, async (transaction) => {
    const chartSnapshot = await transaction.get(chartRef);
    if (!chartSnapshot.exists()) {
      throw new Error("No chart found for that case number.");
    }

    const chart = chartSnapshot.data();
    if (chart.status === "borrowed") {
      throw new Error("This chart is already borrowed.");
    }

    transaction.set(requestRef, {
      ...safeRequest,
      caseNumber: safeCaseNumber,
      requestedById: user.uid,
      requestedBy,
      requestedByEmail: safeRequest.requestedByEmail || profile.email || user.email || "",
      requestedByRole: role,
      requestedByDepartment: safeRequest.requestedByDepartment || profile.department || "",
      requestedByClinic: safeRequest.requestedByClinic || profile.clinic || "",
      status: "pending",
      activeLogId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await addUserNotification({
    type: "info",
    title: "Chart Request Submitted",
    message: `${requestedBy || "Clinical user"} requested chart ${safeCaseNumber}.`,
    patientName: safeRequest.patientName,
    caseNumber: safeCaseNumber,
    action: "Chart Request Submitted",
    sourceUserName: requestedBy,
    targetRole: "medicalRecords",
    targetPath: `/chart-requests?search=${encodeURIComponent(safeCaseNumber)}`,
  });
  return requestRef.id;
}

// Updates chart request status while preserving the handoff sequence:
// Records prepares the chart, the requester returns it, Records receives the return, then completes it.
export async function updateChartRequest(id, updates) {
  const database = requireDb();
  const { user, profile, role } = await requireActiveRole({ roles: allUserRoles });
  const requestRef = doc(database, "chartRequests", id);
  const requestSnapshot = await getDoc(requestRef);
  if (!requestSnapshot.exists()) {
    throw new Error("This chart request no longer exists.");
  }

  const currentRequest = requestSnapshot.data();
  const isRecordsUser = medicalRecordsRoles.includes(role);
  const safeUpdates = sanitizeChartRequestPayload(updates);
  const nextStatus = safeUpdates.status || currentRequest.status;
  assertChartRequestTransition(currentRequest.status, nextStatus);

  if (isRecordsUser && nextStatus === "received") {
    throw new Error("The requesting clinician must confirm chart receipt.");
  }

  if (!isRecordsUser) {
    const canCancelOwnRequest =
      currentRequest.requestedById === user.uid &&
      currentRequest.status === "pending" &&
      nextStatus === "canceled";
    const canConfirmOwnReceipt =
      currentRequest.requestedById === user.uid &&
      currentRequest.status === "ready" &&
      nextStatus === "received";
    const canReturnOwnBorrowedChart =
      currentRequest.requestedById === user.uid &&
      currentRequest.status === "received" &&
      nextStatus === "returned";

    if (!canCancelOwnRequest && !canConfirmOwnReceipt && !canReturnOwnBorrowedChart) {
      throw new Error("Only Medical Records can update chart request status.");
    }
  }

  const staffStamp = isRecordsUser
    ? {
        preparedBy: safeUpdates.preparedBy || profile.fullName || profile.displayName || user.displayName || user.email || "",
      }
    : {};

  if (nextStatus === "ready") {
    const safeCaseNumber = sanitizeText(currentRequest.caseNumber, { maxLength: 60, uppercase: true });
    const chartRef = doc(database, "charts", safeCaseNumber);
    const logRef = doc(collection(database, "chartLogs"));
    const readyAt = safeUpdates.readyAt || new Date().toISOString();
    const borrowerDepartment = currentRequest.requestedByClinic || currentRequest.requestedByDepartment || "Clinic / Nurse Station";
    const preparedBy = staffStamp.preparedBy || "";

    await runTransaction(database, async (transaction) => {
      const chartSnapshot = await transaction.get(chartRef);
      if (!chartSnapshot.exists()) {
        throw new Error("No chart found for that case number.");
      }

      const chart = chartSnapshot.data();
      if (chart.status === "borrowed") {
        throw new Error("This chart is already borrowed.");
      }

      transaction.set(logRef, {
        action: "borrowed",
        patientName: currentRequest.patientName || chart.patientName || "",
        caseNumber: safeCaseNumber,
        borrowedBy: currentRequest.requestedBy || "Clinical requester",
        requestedById: currentRequest.requestedById || "",
        returnedBy: "",
        department: borrowerDepartment,
        timestamp: readyAt,
        borrowedAt: readyAt,
        returnedAt: "",
        dueDate: "",
        remarks: safeUpdates.remarks || currentRequest.purpose || "Chart prepared and locked for pickup",
        createdAt: serverTimestamp(),
      });

      transaction.update(chartRef, {
        caseNumber: safeCaseNumber,
        status: "borrowed",
        borrower: currentRequest.requestedBy || "Clinical requester",
        borrowerId: currentRequest.requestedById || "",
        department: borrowerDepartment,
        borrowedAt: readyAt,
        dueDate: "",
        activeLogId: logRef.id,
        history: [
          {
            action: "checkout",
            borrower: currentRequest.requestedBy || "Clinical requester",
            returnedBy: "",
            department: borrowerDepartment,
            date: readyAt,
          },
          ...(chart.history || []),
        ],
        updatedAt: serverTimestamp(),
      });

      transaction.update(requestRef, {
        ...safeUpdates,
        preparedBy,
        status: "ready",
        readyAt,
        borrowedAt: readyAt,
        activeLogId: logRef.id,
        updatedAt: serverTimestamp(),
      });
    });
  } else if (nextStatus === "returned") {
    const returnedAt = safeUpdates.returnedAt || new Date().toISOString();

    await updateDoc(requestRef, {
      ...safeUpdates,
      status: "returned",
      returnedAt,
      updatedAt: serverTimestamp(),
    });
  } else if (nextStatus === "returnReceived") {
    const safeCaseNumber = sanitizeText(currentRequest.caseNumber, { maxLength: 60, uppercase: true });
    const chartRef = doc(database, "charts", safeCaseNumber);
    const returnReceivedAt = safeUpdates.returnReceivedAt || new Date().toISOString();
    const returnedAt = currentRequest.returnedAt || safeUpdates.returnedAt || returnReceivedAt;
    const returner = currentRequest.requestedBy || "Clinical requester";
    const receivedBy = staffStamp.preparedBy || profile.fullName || profile.displayName || user.displayName || user.email || "";

    await runTransaction(database, async (transaction) => {
      const chartSnapshot = await transaction.get(chartRef);
      if (!chartSnapshot.exists()) {
        throw new Error("No chart found for that case number.");
      }

      const chart = chartSnapshot.data();
      if (!["borrowed", "available"].includes(chart.status)) {
        throw new Error("This chart cannot be received right now.");
      }

      if (chart.status === "borrowed") {
        const returnedLog = {
          action: "returned",
          patientName: currentRequest.patientName || chart.patientName || "",
          caseNumber: safeCaseNumber,
          borrowedBy: chart.borrower || currentRequest.requestedBy || "N/A",
          requestedById: currentRequest.requestedById || user.uid,
          returnedBy: returner,
          department: chart.department || currentRequest.requestedByClinic || currentRequest.requestedByDepartment || "N/A",
          timestamp: chart.borrowedAt || currentRequest.borrowedAt || returnedAt,
          borrowedAt: chart.borrowedAt || currentRequest.borrowedAt || returnedAt,
          returnedAt,
          dueDate: "",
          remarks: safeUpdates.remarks || `Returned by requester and received by ${receivedBy}`,
          updatedAt: serverTimestamp(),
        };
        const activeLogId = chart.activeLogId || currentRequest.activeLogId;

        if (activeLogId) {
          const logRef = doc(database, "chartLogs", activeLogId);
          const logSnapshot = await transaction.get(logRef);

          if (logSnapshot.exists()) {
            transaction.update(logRef, returnedLog);
          } else {
            transaction.set(doc(collection(database, "chartLogs")), {
              ...returnedLog,
              createdAt: serverTimestamp(),
            });
          }
        } else {
          transaction.set(doc(collection(database, "chartLogs")), {
            ...returnedLog,
            createdAt: serverTimestamp(),
          });
        }

        transaction.update(chartRef, {
          caseNumber: safeCaseNumber,
          status: "available",
          borrower: "",
          borrowerId: "",
          department: "",
          borrowedAt: "",
          dueDate: "",
          activeLogId: "",
          history: [
            {
              action: "checkin",
              date: returnReceivedAt,
              borrower: chart.borrower || currentRequest.requestedBy || "N/A",
              returnedBy: returner,
              department: chart.department || currentRequest.requestedByClinic || currentRequest.requestedByDepartment || "N/A",
            },
            ...(chart.history || []),
          ],
          updatedAt: serverTimestamp(),
        });
      }

      transaction.update(requestRef, {
        ...safeUpdates,
        ...staffStamp,
        status: "returnReceived",
        returnedAt,
        returnReceivedAt,
        updatedAt: serverTimestamp(),
      });
    });
  } else {
    await updateDoc(requestRef, {
      ...safeUpdates,
      ...staffStamp,
      updatedAt: serverTimestamp(),
    });
  }

  if (isRecordsUser && currentRequest.requestedById && currentRequest.requestedById !== user.uid) {
    await addUserNotification({
      type: nextStatus === "ready" || nextStatus === "completed" ? "success" : nextStatus === "canceled" ? "error" : "info",
      title: "Chart Request Updated",
      message: `${currentRequest.caseNumber} is now ${nextStatus}.`,
      patientName: currentRequest.patientName || "",
      caseNumber: currentRequest.caseNumber || "",
      action: "Chart Request Status Updated",
      sourceUserName: profile.fullName || profile.displayName || user.displayName || user.email || "",
      targetUserId: currentRequest.requestedById,
      targetPath: `/chart-requests?search=${encodeURIComponent(currentRequest.caseNumber || "")}`,
    });
  } else if (!isRecordsUser && nextStatus === "canceled") {
    await addUserNotification({
      type: "error",
      title: "Chart Request Canceled",
      message: `${currentRequest.caseNumber} was canceled by the requester.`,
      patientName: currentRequest.patientName || "",
      caseNumber: currentRequest.caseNumber || "",
      action: "Chart Request Canceled",
      sourceUserName: profile.fullName || profile.displayName || user.displayName || user.email || "",
      targetRole: "medicalRecords",
      targetPath: `/chart-requests?search=${encodeURIComponent(currentRequest.caseNumber || "")}`,
    });
  } else if (!isRecordsUser && nextStatus === "received") {
    await addUserNotification({
      type: "success",
      title: "Chart Received",
      message: `${currentRequest.caseNumber} was received by the requester.`,
      patientName: currentRequest.patientName || "",
      caseNumber: currentRequest.caseNumber || "",
      action: "Chart Request Received",
      sourceUserName: profile.fullName || profile.displayName || user.displayName || user.email || "",
      targetRole: "medicalRecords",
      targetPath: `/chart-requests?search=${encodeURIComponent(currentRequest.caseNumber || "")}`,
    });
  } else if (!isRecordsUser && nextStatus === "returned") {
    await addUserNotification({
      type: "success",
      title: "Chart Returned",
      message: `${currentRequest.caseNumber} was returned by the requester.`,
      patientName: currentRequest.patientName || "",
      caseNumber: currentRequest.caseNumber || "",
      action: "Chart Request Returned",
      sourceUserName: profile.fullName || profile.displayName || user.displayName || user.email || "",
      targetRole: "medicalRecords",
      targetPath: `/chart-requests?search=${encodeURIComponent(currentRequest.caseNumber || "")}`,
    });
  }
}

// Deletes a chart audit log by id. A completed (returned) chart transaction is
// never erased: it is flipped to "voided" so the chart report keeps a permanent
// audit trail that the record was removed. Active or canceled logs that are not
// completed transactions are removed outright.
export async function deleteChartLog(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  const logRef = doc(database, "chartLogs", id);
  const logSnapshot = await getDoc(logRef);
  const log = logSnapshot.exists() ? logSnapshot.data() : {};

  if (log.action === "returned") {
    await updateDoc(logRef, {
      action: "voided",
      voidedAt: new Date().toISOString(),
      remarks: "Record was deleted.",
      updatedAt: serverTimestamp(),
    });
    return "voided";
  }

  await deleteDoc(logRef);
  return "deleted";
}

// Deletes a clinical chart request report row and its linked chart movement log.
export async function deleteChartRequestReport(id) {
  const database = requireDb();
  const { user, role } = await requireActiveRole({ roles: allUserRoles });
  const requestRef = doc(database, "chartRequests", id);
  const requestSnapshot = await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    throw new Error("This report row no longer exists.");
  }

  const request = requestSnapshot.data();
  const isRecordsUser = medicalRecordsRoles.includes(role);
  const terminalStatuses = ["returned", "completed", "canceled"];

  if (!isRecordsUser && request.requestedById !== user.uid) {
    throw new Error("You can only delete your own chart report rows.");
  }
  if (!isRecordsUser && !terminalStatuses.includes(request.status)) {
    throw new Error("Only returned, completed, or canceled chart report rows can be deleted.");
  }

  const linkedLogIds = new Set();
  if (request.activeLogId) linkedLogIds.add(request.activeLogId);

  const linkedLogsSnapshot = await getDocs(
    query(collection(database, "chartLogs"), where("requestId", "==", id)),
  );
  linkedLogsSnapshot.docs.forEach((logSnapshot) => linkedLogIds.add(logSnapshot.id));

  if (linkedLogIds.size > 0) {
    const batch = writeBatch(database);
    linkedLogIds.forEach((logId) => {
      batch.delete(doc(database, "chartLogs", logId));
    });
    await batch.commit();
  }

  await deleteDoc(requestRef);
}

// Adds a centralized audit action for important CRUD and account events.
export async function addAuditLog(log) {
  const database = requireDb();
  await requireActiveRole({ roles: allUserRoles });
  await addDoc(collection(database, "auditLogs"), {
    ...sanitizeAuditLogPayload(log),
    createdAt: serverTimestamp(),
  });
}

// Permanently clears all centralized audit actions, then records the clear event.
export async function clearAuditLogs(log) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  const logsSnapshot = await getDocs(collection(database, "auditLogs"));
  const logRows = logsSnapshot.docs;

  for (let index = 0; index < logRows.length; index += 450) {
    const batch = writeBatch(database);
    logRows.slice(index, index + 450).forEach((logSnapshot) => {
      batch.delete(logSnapshot.ref);
    });
    await batch.commit();
  }

  await addDoc(collection(database, "auditLogs"), {
    ...sanitizeAuditLogPayload(log),
    createdAt: serverTimestamp(),
  });
}

// Deletes a centralized audit action from the admin log.
export async function deleteAuditLog(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await deleteDoc(doc(database, "auditLogs", id));
}
