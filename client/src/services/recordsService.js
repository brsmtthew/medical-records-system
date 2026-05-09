import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebaseClient";
import { sortNewestFirst } from "../utils/recordSorting";
import { sanitizeRecordPayload, sanitizeText } from "../utils/security";

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

// Returns the configured Firestore instance or fails fast with a user-facing setup message.
function requireDb() {
  if (!db) {
    throw new Error(recordsUnavailableMessage);
  }
  return db;
}

async function requireActiveRole({ adminOnly = false } = {}) {
  const database = requireDb();
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Sign in again before making this change.");
  }

  const profileSnapshot = await getDoc(doc(database, "users", user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
  const isActive = profile.accountStatus !== "disabled";
  const role = profile.role === "admin" ? "admin" : "staff";

  if (!isActive) {
    throw new Error("This account is disabled.");
  }
  if (adminOnly && role !== "admin") {
    throw new Error("Administrator access is required for this action.");
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
    recordType: { maxLength: 30 },
    status: { maxLength: 30 },
    borrower: { maxLength: 160 },
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
    restrictionReason: { maxLength: 300 },
  });

  if (safeUpdates.role && !["admin", "staff"].includes(safeUpdates.role)) {
    throw new Error("Role must be admin or staff.");
  }

  return safeUpdates;
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

  return firstAdmission < secondDischarge && secondAdmission < firstDischarge;
}

// Prevents new or edited readmission dates from predating the first known record.
async function patientAdmissionBeforeFirstRecordExists(database, patient, ignoredCaseNumber = "") {
  const candidate = normalizePatientStay(patient);
  const candidateAdmission = dateValue(candidate.admissionDate);
  if (!candidate.name || !candidateAdmission) return false;

  const patientRows = await getDocs(
    query(collection(database, "patients"), where("name", "==", candidate.name)),
  );

  const firstExistingAdmission = patientRows.docs
    .filter((patientSnapshot) => !ignoredCaseNumber || patientSnapshot.id !== ignoredCaseNumber)
    .map((patientSnapshot) => dateValue(patientSnapshot.data().admissionDate))
    .filter(Boolean)
    .sort((first, second) => first - second)[0];

  return Boolean(firstExistingAdmission && candidateAdmission < firstExistingAdmission);
}

// Checks Firestore for an existing inpatient stay that overlaps the candidate row.
async function overlappingPatientStayExists(database, patient, ignoredCaseNumber = "") {
  const candidate = normalizePatientStay(patient);
  if (!candidate.name || !candidate.admissionDate) return false;

  const patientRows = await getDocs(
    query(collection(database, "patients"), where("name", "==", candidate.name)),
  );

  return patientRows.docs.some((patientSnapshot) => {
    if (ignoredCaseNumber && patientSnapshot.id === ignoredCaseNumber) return false;

    const row = normalizePatientStay(patientSnapshot.data());
    return (
      row.name === candidate.name &&
      patientStayOverlaps(row, candidate)
    );
  });
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
  await requireActiveRole({ adminOnly: true });
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
  await requireActiveRole({ adminOnly: true });
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
  await requireActiveRole({ adminOnly: true });
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
  await requireActiveRole({ adminOnly: true });
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
  await requireActiveRole({ adminOnly: true });
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
  await requireActiveRole({ adminOnly: true });
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

// Creates a patient and its matching available chart document.
export async function createPatient(patient) {
  const database = requireDb();
  await requireActiveRole();
  const safePatient = sanitizePatientPayload(patient);
  const patientRef = doc(database, "patients", safePatient.caseNumber);
  const chartRef = doc(database, "charts", safePatient.caseNumber);
  const now = serverTimestamp();
  const [patientSnapshot, chartSnapshot] = await Promise.all([
    getDoc(patientRef),
    getDoc(chartRef),
  ]);

  if (patientSnapshot.exists() || chartSnapshot.exists()) {
    throw new Error(duplicateCaseNumberMessage);
  }

  if (await overlappingPatientStayExists(database, safePatient)) {
    throw new Error(duplicatePatientStayMessage);
  }
  if (await patientAdmissionBeforeFirstRecordExists(database, safePatient)) {
    throw new Error(patientBeforeFirstRecordMessage);
  }

  await setDoc(patientRef, {
    ...safePatient,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(chartRef, {
    caseNumber: safePatient.caseNumber,
    patientName: safePatient.name,
    patientDepartment: safePatient.department || "",
    recordType: safePatient.recordType || "new",
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

    await setDoc(nextPatientRef, {
      ...safePatient,
      previousCaseNumber,
      renamePendingBy: user.uid,
      createdAt: safePatient.createdAt || now,
      updatedAt: now,
    });

    await setDoc(nextChartRef, {
      ...previousChart,
      caseNumber: safePatient.caseNumber,
      previousCaseNumber,
      renamePendingBy: user.uid,
      patientName: safePatient.name,
      patientDepartment: safePatient.department || "",
      recordType: safePatient.recordType || "new",
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

    if (previousChart.activeLogId) {
      await updateChartLogIfExists(previousChart.activeLogId, {
        patientName: safePatient.name,
        caseNumber: safePatient.caseNumber,
      });
    }

    await updateDoc(doc(database, "patients", previousCaseNumber), {
      renamePendingBy: user.uid,
      renamePendingTo: safePatient.caseNumber,
      updatedAt: now,
    });
    await updateDoc(previousChartRef, {
      renamePendingBy: user.uid,
      renamePendingTo: safePatient.caseNumber,
      updatedAt: now,
    });
    await deleteDoc(doc(database, "patients", previousCaseNumber));
    await deleteDoc(previousChartRef);
    return;
  }

  if (await overlappingPatientStayExists(database, safePatient, previousCaseNumber)) {
    throw new Error(duplicatePatientStayMessage);
  }
  if (await patientAdmissionBeforeFirstRecordExists(database, safePatient, previousCaseNumber)) {
    throw new Error(patientBeforeFirstRecordMessage);
  }

  await updateDoc(doc(database, "patients", safePatient.caseNumber), {
    ...safePatient,
    updatedAt: now,
  });

  await updateDoc(doc(database, "charts", safePatient.caseNumber), {
    patientName: safePatient.name,
    patientDepartment: safePatient.department || "",
    recordType: safePatient.recordType || "new",
    updatedAt: now,
  });
}

// Deletes a patient and cancels active borrow logs tied to its chart.
export async function deletePatient(caseNumber) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  const chartRef = doc(database, "charts", caseNumber);
  const chartSnapshot = await getDoc(chartRef);
  const chart = chartSnapshot.exists() ? chartSnapshot.data() : null;
  const cancellationTime = new Date().toISOString();

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

    await Promise.all(
      borrowedLogsSnapshot.docs.map((logSnapshot) =>
        updateDoc(doc(database, "chartLogs", logSnapshot.id), cancelledLogUpdate),
      ),
    );

    if (chart.activeLogId && !borrowedLogsSnapshot.docs.some((logSnapshot) => logSnapshot.id === chart.activeLogId)) {
      await updateChartLogIfExists(chart.activeLogId, cancelledLogUpdate);
    }
  }

  await deleteDoc(doc(database, "patients", caseNumber));
  await deleteDoc(chartRef);
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

// Deletes a chart audit log by id.
export async function deleteChartLog(id) {
  const database = requireDb();
  await requireActiveRole({ adminOnly: true });
  await deleteDoc(doc(database, "chartLogs", id));
}

// Adds a centralized audit action for important CRUD and account events.
export async function addAuditLog(log) {
  const database = requireDb();
  await requireActiveRole();
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
