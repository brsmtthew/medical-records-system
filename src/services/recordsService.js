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
} from "firebase/firestore";
import { db } from "../firebaseClient";
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

function requireDb() {
  if (!db) {
    throw new Error(recordsUnavailableMessage);
  }
  return db;
}

function snapshotRows(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function sortByName(rows) {
  return [...rows].sort((first, second) => String(first.name || "").localeCompare(String(second.name || "")));
}

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

function sanitizeDepartmentName(name) {
  return sanitizeText(name, { maxLength: 120, uppercase: true });
}

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

function dateValue(value) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

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

export function subscribeToPatients(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "patients"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

export function subscribeToCharts(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "charts"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

export function subscribeToChartLogs(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "chartLogs"), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

export function subscribeToDepartments(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => !["admissionLocation", "outpatientDepartment"].includes(row.type))));
  }, onError);
}

export function subscribeToAdmissionLocations(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => row.type === "admissionLocation")));
  }, onError);
}

export function subscribeToOutpatientDepartments(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(collection(db, "departments"), (snapshot) => {
    onRows(sortByName(snapshotRows(snapshot).filter((row) => row.type === "outpatientDepartment")));
  }, onError);
}

export async function addDepartment(name) {
  const database = requireDb();
  const departmentName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: departmentName,
    type: "chartDepartment",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDepartment(id, name) {
  const database = requireDb();
  const departmentName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: departmentName,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDepartment(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "departments", id));
}

export async function addAdmissionLocation(name) {
  const database = requireDb();
  const locationName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: locationName,
    type: "admissionLocation",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAdmissionLocation(id, name) {
  const database = requireDb();
  const locationName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: locationName,
    type: "admissionLocation",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAdmissionLocation(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "departments", id));
}

export async function addOutpatientDepartment(name) {
  const database = requireDb();
  const departmentName = sanitizeDepartmentName(name);
  await addDoc(collection(database, "departments"), {
    name: departmentName,
    type: "outpatientDepartment",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateOutpatientDepartment(id, name) {
  const database = requireDb();
  const departmentName = sanitizeDepartmentName(name);
  await updateDoc(doc(database, "departments", id), {
    name: departmentName,
    type: "outpatientDepartment",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOutpatientDepartment(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "departments", id));
}

export async function createPatient(patient) {
  const database = requireDb();
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

export async function updatePatient(previousCaseNumber, patient) {
  const database = requireDb();
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
      createdAt: safePatient.createdAt || now,
      updatedAt: now,
    });

    await setDoc(nextChartRef, {
      ...previousChart,
      caseNumber: safePatient.caseNumber,
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

export async function deletePatient(caseNumber) {
  const database = requireDb();
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

export async function updateChart(caseNumber, updates) {
  const database = requireDb();
  await updateDoc(doc(database, "charts", caseNumber), {
    ...sanitizeChartPayload(updates),
    updatedAt: serverTimestamp(),
  });
}

export async function addChartLog(log) {
  const database = requireDb();
  const logRef = await addDoc(collection(database, "chartLogs"), {
    ...sanitizeChartLogPayload(log),
    createdAt: serverTimestamp(),
  });
  return logRef.id;
}

export async function updateChartLog(id, log) {
  const database = requireDb();
  await updateDoc(doc(database, "chartLogs", id), {
    ...sanitizeChartLogPayload(log),
    updatedAt: serverTimestamp(),
  });
}

export async function updateChartLogIfExists(id, log) {
  const database = requireDb();
  const logRef = doc(database, "chartLogs", id);
  const logSnapshot = await getDoc(logRef);
  if (!logSnapshot.exists()) return false;

  await updateDoc(logRef, {
    ...sanitizeChartLogPayload(log),
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function deleteChartLog(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "chartLogs", id));
}
