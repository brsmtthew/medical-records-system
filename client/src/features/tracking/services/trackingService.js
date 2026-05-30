import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/firebaseClient";
import { sortNewestFirst } from "@shared/utils/recordSorting";
import { sanitizeRecordPayload } from "@shared/utils/security";
import { getActiveUserProfile, recordsUnavailableMessage } from "@services/recordsService";
import {
  assertCanReleaseTrackingRow,
  assertCanReviewTrackingRow,
  assertEditableTrackingRow,
} from "@shared/utils/workflowGuards";

const allowedCollections = new Set([
  "medicalDocumentRequests",
  "labResultRequests",
  "vitalCertificateRequests",
]);

function requireTrackingDb(collectionName) {
  if (!allowedCollections.has(collectionName)) {
    throw new Error("Unsupported tracking collection.");
  }
  if (!db) {
    throw new Error(recordsUnavailableMessage);
  }
  return db;
}

async function requireActiveTrackingRole({ adminOnly = false } = {}) {
  const database = requireTrackingDb("medicalDocumentRequests");
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Sign in again before making this change.");
  }

  let profile = getActiveUserProfile(user.uid);
  if (!profile) {
    const profileSnapshot = await getDoc(doc(database, "users", user.uid));
    profile = profileSnapshot.exists() ? { uid: user.uid, ...profileSnapshot.data() } : {};
  }
  const role = profile.role === "admin" ? "admin" : "staff";

  if (["disabled", "deleted", "missing"].includes(profile.accountStatus || "active")) {
    throw new Error("This account is not active.");
  }
  if (adminOnly && role !== "admin") {
    throw new Error("Administrator access is required for this action.");
  }

  return { user, profile, role };
}

function snapshotRows(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function sanitizeTrackingPayload(payload) {
  return sanitizeRecordPayload(payload, {
    patientName: { maxLength: 160, uppercase: true },
    caseNumber: { maxLength: 60, uppercase: true },
    birthday: { maxLength: 20 },
    dateOfDeath: { maxLength: 20 },
    documentType: { maxLength: 80 },
    reviewStatus: { maxLength: 40 },
    releaseStatus: { maxLength: 40 },
    paymentStatus: { maxLength: 40 },
    requestedAt: { maxLength: 40 },
    reviewedAt: { maxLength: 40 },
    releasedAt: { maxLength: 40 },
    receivedBy: { maxLength: 160 },
    receiverRelationship: { maxLength: 80 },
    reviewRelationship: { maxLength: 80 },
    remarks: { maxLength: 500 },
    releasedBy: { maxLength: 160 },
    reviewedBy: { maxLength: 160 },
  });
}

function normalizeVitalCertificateDates(payload) {
  const typeList = Array.isArray(payload.typeList) ? payload.typeList : [];
  const hasBirthType = typeList.includes("birth");
  const hasDeathType = typeList.some((type) => ["death", "fetalDeath"].includes(type));

  if (!typeList.length || (hasBirthType && hasDeathType)) {
    return payload;
  }

  return {
    ...payload,
    ...(hasBirthType ? { dateOfDeath: "" } : {}),
    ...(hasDeathType ? { birthday: "" } : {}),
  };
}

function normalizeTrackingPayload(collectionName, payload) {
  if (collectionName !== "vitalCertificateRequests") return payload;
  return normalizeVitalCertificateDates(payload);
}

function rowTypeList(row) {
  if (Array.isArray(row.typeList) && row.typeList.length) return row.typeList;
  return row.documentType ? [row.documentType] : [];
}

async function splitTypedTrackingRow(database, collectionName, id, type, updates) {
  if (!["medicalDocumentRequests", "vitalCertificateRequests"].includes(collectionName) || !type) {
    await updateDoc(doc(database, collectionName, id), updates);
    return;
  }

  const rowRef = doc(database, collectionName, id);
  const rowSnapshot = await getDoc(rowRef);
  const currentRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  const currentTypes = rowTypeList(currentRow);

  if (currentTypes.length <= 1 || !currentTypes.includes(type)) {
    const nextUpdates = normalizeTrackingPayload(collectionName, {
      ...updates,
      typeList: currentTypes.length ? currentTypes : [type],
    });

    await updateDoc(rowRef, {
      ...nextUpdates,
      documentType: collectionName === "medicalDocumentRequests" ? type : currentRow.documentType || "",
    });
    return;
  }

  const nextTypeList = currentTypes.filter((item) => item !== type);
  await updateDoc(rowRef, {
    typeList: nextTypeList,
    documentType: collectionName === "medicalDocumentRequests" ? nextTypeList[0] || "" : currentRow.documentType || "",
    updatedAt: serverTimestamp(),
  });

  const splitPayload = normalizeTrackingPayload(collectionName, {
    ...currentRow,
    ...updates,
    typeList: [type],
  });

  await addDoc(collection(database, collectionName), {
    ...splitPayload,
    documentType: collectionName === "medicalDocumentRequests" ? type : currentRow.documentType || "",
    splitFromId: id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

const cancelTerminalStatuses = new Set(["canceled", "released", "voided"]);

function isCancelableDuplicate(collectionName, targetRow, row) {
  if (cancelTerminalStatuses.has(row.releaseStatus)) return false;

  if (collectionName === "medicalDocumentRequests") {
    return row.documentType === targetRow.documentType;
  }

  if (collectionName === "labResultRequests") {
    return !targetRow.requestedAt || row.requestedAt === targetRow.requestedAt;
  }

  return false;
}

export function subscribeToTrackingRows(collectionName, onRows, onError) {
  if (!db) {
    onRows([]);
    return () => {};
  }

  if (!allowedCollections.has(collectionName)) {
    onError?.(new Error("Unsupported tracking collection."));
    return () => {};
  }

  return onSnapshot(collection(db, collectionName), (snapshot) => {
    onRows(sortNewestFirst(snapshotRows(snapshot)));
  }, onError);
}

export async function addTrackingRow(collectionName, payload) {
  const database = requireTrackingDb(collectionName);
  const { user, profile } = await requireActiveTrackingRole();
  const normalizedPayload = normalizeTrackingPayload(collectionName, payload);
  await addDoc(collection(database, collectionName), {
    ...sanitizeTrackingPayload(normalizedPayload),
    typeList: Array.isArray(normalizedPayload.typeList) ? normalizedPayload.typeList.slice(0, 3) : [],
    copyCount: Math.max(0, Number(normalizedPayload.copyCount) || 0),
    totalAmount: Math.max(0, Number(normalizedPayload.totalAmount) || 0),
    createdBy: user.uid,
    createdByName: profile.fullName || user.displayName || user.email || "Unknown User",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTrackingRow(collectionName, id, payload) {
  const database = requireTrackingDb(collectionName);
  await requireActiveTrackingRole();
  const rowRef = doc(database, collectionName, id);
  const rowSnapshot = await getDoc(rowRef);
  const currentRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  assertEditableTrackingRow(currentRow);

  const normalizedPayload = normalizeTrackingPayload(collectionName, payload);
  await updateDoc(rowRef, {
    ...sanitizeTrackingPayload(normalizedPayload),
    typeList: Array.isArray(normalizedPayload.typeList) ? normalizedPayload.typeList.slice(0, 3) : [],
    copyCount: Math.max(0, Number(normalizedPayload.copyCount) || 0),
    totalAmount: Math.max(0, Number(normalizedPayload.totalAmount) || 0),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrackingRow(collectionName, id) {
  const database = requireTrackingDb(collectionName);
  await requireActiveTrackingRole({ adminOnly: true });
  await deleteDoc(doc(database, collectionName, id));
}

export async function cancelTrackingRow(collectionName, id, sourceLabel = "tracking page") {
  const database = requireTrackingDb(collectionName);
  await requireActiveTrackingRole({ adminOnly: true });
  const rowRef = doc(database, collectionName, id);
  const rowSnapshot = await getDoc(rowRef);
  const targetRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  const cancelUpdate = {
    releaseStatus: "canceled",
    remarks: `Record was deleted from ${sourceLabel}. Transaction canceled.`,
    canceledAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };

  if (!targetRow.caseNumber) {
    await updateDoc(rowRef, cancelUpdate);
    return;
  }

  const matchingRows = await getDocs(query(
    collection(database, collectionName),
    where("caseNumber", "==", targetRow.caseNumber),
  ));
  const batch = writeBatch(database);
  let hasBatchUpdate = false;

  matchingRows.docs.forEach((matchingRow) => {
    const row = matchingRow.data();
    if (matchingRow.id !== id && !isCancelableDuplicate(collectionName, targetRow, row)) return;
    batch.update(doc(database, collectionName, matchingRow.id), cancelUpdate);
    hasBatchUpdate = true;
  });

  if (!hasBatchUpdate) {
    batch.update(rowRef, cancelUpdate);
  }

  await batch.commit();
}

export async function deleteTrackingRowType(collectionName, id, type) {
  const database = requireTrackingDb(collectionName);
  await requireActiveTrackingRole({ adminOnly: true });
  const rowRef = doc(database, collectionName, id);
  const rowSnapshot = await getDoc(rowRef);
  const currentRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  assertEditableTrackingRow(currentRow);

  const typeList = rowTypeList(currentRow);
  const nextTypeList = typeList.filter((item) => item !== type);

  if (nextTypeList.length === 0) {
    await deleteDoc(rowRef);
    return;
  }

  await updateDoc(rowRef, {
    typeList: nextTypeList,
    documentType: collectionName === "medicalDocumentRequests" ? nextTypeList[0] || "" : currentRow.documentType || "",
    updatedAt: serverTimestamp(),
  });
}

export async function markTrackingRowReviewed(collectionName, id, payload = {}) {
  const database = requireTrackingDb(collectionName);
  const { user, profile } = await requireActiveTrackingRole();
  const rowSnapshot = await getDoc(doc(database, collectionName, id));
  const currentRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  assertCanReviewTrackingRow(currentRow);

  const reviewedAt = new Date().toISOString();
  const reviewPayload = sanitizeTrackingPayload(payload);
  const reviewedBy = reviewPayload.reviewedBy || profile.fullName || user.displayName || user.email || "Unknown User";
  const reviewRelationship = reviewPayload.reviewRelationship || "";

  await splitTypedTrackingRow(database, collectionName, id, payload.type, {
    reviewStatus: "reviewed",
    reviewedAt,
    reviewedBy,
    reviewRelationship,
    reviewHistory: arrayUnion({
      reviewedAt,
      reviewedBy,
      reviewRelationship,
      userId: user.uid,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function releaseTrackingRow(collectionName, id, payload) {
  const database = requireTrackingDb(collectionName);
  const { user, profile } = await requireActiveTrackingRole();
  const rowRef = doc(database, collectionName, id);
  const rowSnapshot = await getDoc(rowRef);
  const currentRow = rowSnapshot.exists() ? rowSnapshot.data() : {};
  const candidateRow = { ...currentRow, ...payload };
  assertCanReleaseTrackingRow(collectionName, candidateRow);

  const releasePayload = sanitizeTrackingPayload(payload);
  const releasedAt = new Date().toISOString();
  const releasedBy = profile.fullName || user.displayName || user.email || "Unknown User";
  const nextReleaseStatus = collectionName === "vitalCertificateRequests"
    ? releasePayload.remarks || "released"
    : "released";
  const releasedUpdates = {
    releaseStatus: nextReleaseStatus,
    releasedAt: nextReleaseStatus === "released" ? releasedAt : "",
    receivedBy: releasePayload.receivedBy || "",
    receiverRelationship: releasePayload.receiverRelationship || "",
    remarks: collectionName === "vitalCertificateRequests" ? "" : releasePayload.remarks || "Released",
    releasedBy: nextReleaseStatus === "released" ? releasedBy : "",
    releaseHistory: arrayUnion({
      releasedAt,
      receivedBy: releasePayload.receivedBy || "",
      receiverRelationship: releasePayload.receiverRelationship || "",
      releaseStatus: nextReleaseStatus,
      remarks: collectionName === "vitalCertificateRequests" ? "" : releasePayload.remarks || "Released",
      releasedBy,
      userId: user.uid,
    }),
    updatedAt: serverTimestamp(),
  };

  if (collectionName === "labResultRequests") {
    releasedUpdates.paymentStatus = releasePayload.paymentStatus || "paid";
  }

  await splitTypedTrackingRow(database, collectionName, id, payload.type, releasedUpdates);
}
