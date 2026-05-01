import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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

function requireDb() {
  if (!db) {
    throw new Error(recordsUnavailableMessage);
  }
  return db;
}

function snapshotRows(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function subscribeToPatients(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, "patients"), orderBy("createdAt", "desc")), (snapshot) => {
    onRows(snapshotRows(snapshot));
  }, onError);
}

export function subscribeToCharts(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, "charts"), orderBy("createdAt", "desc")), (snapshot) => {
    onRows(snapshotRows(snapshot));
  }, onError);
}

export function subscribeToChartLogs(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, "chartLogs"), orderBy("timestamp", "desc")), (snapshot) => {
    onRows(snapshotRows(snapshot));
  }, onError);
}

export function subscribeToDepartments(onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, "departments"), orderBy("name", "asc")), (snapshot) => {
    onRows(snapshotRows(snapshot));
  }, onError);
}

export async function addDepartment(name) {
  const database = requireDb();
  await addDoc(collection(database, "departments"), {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDepartment(id, name) {
  const database = requireDb();
  await updateDoc(doc(database, "departments", id), {
    name,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDepartment(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "departments", id));
}

export async function createPatient(patient) {
  const database = requireDb();
  const patientRef = doc(database, "patients", patient.caseNumber);
  const chartRef = doc(database, "charts", patient.caseNumber);
  const now = serverTimestamp();

  await setDoc(patientRef, {
    ...patient,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(chartRef, {
    caseNumber: patient.caseNumber,
    patientName: patient.name,
    recordType: patient.recordType || "new",
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

  if (previousCaseNumber !== patient.caseNumber) {
    await deleteDoc(doc(database, "patients", previousCaseNumber));
    await deleteDoc(doc(database, "charts", previousCaseNumber));
    await createPatient(patient);
    return;
  }

  await updateDoc(doc(database, "patients", patient.caseNumber), {
    ...patient,
    updatedAt: now,
  });

  await updateDoc(doc(database, "charts", patient.caseNumber), {
    patientName: patient.name,
    recordType: patient.recordType || "new",
    updatedAt: now,
  });
}

export async function deletePatient(caseNumber) {
  const database = requireDb();
  await deleteDoc(doc(database, "patients", caseNumber));
  await deleteDoc(doc(database, "charts", caseNumber));
}

export async function updateChart(caseNumber, updates) {
  const database = requireDb();
  await updateDoc(doc(database, "charts", caseNumber), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function addChartLog(log) {
  const database = requireDb();
  const logRef = await addDoc(collection(database, "chartLogs"), {
    ...log,
    createdAt: serverTimestamp(),
  });
  return logRef.id;
}

export async function updateChartLog(id, log) {
  const database = requireDb();
  await updateDoc(doc(database, "chartLogs", id), {
    ...log,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChartLog(id) {
  const database = requireDb();
  await deleteDoc(doc(database, "chartLogs", id));
}
