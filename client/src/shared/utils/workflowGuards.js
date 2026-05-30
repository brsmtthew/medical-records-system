const chartRequestTransitions = {
<<<<<<< HEAD
  pending: new Set(["accepted", "canceled"]),
  accepted: new Set(["preparing", "canceled"]),
  preparing: new Set(["for_pickup", "canceled"]),
  for_pickup: new Set(["received", "canceled"]),
  received: new Set(["for_return"]),
  for_return: new Set(["returned"]),
=======
  pending: new Set(["reviewing", "canceled"]),
  reviewing: new Set(["preparing", "canceled"]),
  preparing: new Set(["ready", "canceled"]),
  ready: new Set(["received"]),
  received: new Set(["returned"]),
  returned: new Set(["returnReceived"]),
  returnReceived: new Set(["completed"]),
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
  completed: new Set([]),
  returned: new Set([]),
  canceled: new Set([]),
};

const terminalReleaseStatuses = new Set(["released", "canceled", "voided"]);

function normalizeStatus(value, fallback = "") {
  return String(value || fallback).trim();
}

export function assertChartRequestTransition(currentStatus, nextStatus) {
  const current = normalizeStatus(currentStatus, "pending");
  const next = normalizeStatus(nextStatus, current);

  if (current === next) return next;
  if (!chartRequestTransitions[current]?.has(next)) {
    throw new Error(`Invalid chart request transition: ${current} to ${next}.`);
  }

  return next;
}

export function assertEditableTrackingRow(row = {}) {
  const releaseStatus = normalizeStatus(row.releaseStatus, "forRelease");
  if (terminalReleaseStatuses.has(releaseStatus)) {
    throw new Error(`This request is already ${releaseStatus} and cannot be edited.`);
  }
}

export function assertCanReviewTrackingRow(row = {}) {
  assertEditableTrackingRow(row);

  if (normalizeStatus(row.reviewStatus, "forReview") === "reviewed") {
    throw new Error("This request has already been reviewed.");
  }
}

export function assertCanReleaseTrackingRow(collectionName, row = {}) {
  assertEditableTrackingRow(row);

  if (collectionName === "vitalCertificateRequests" && normalizeStatus(row.reviewStatus, "forReview") !== "reviewed") {
    throw new Error("Civil documents must be reviewed before release.");
  }

  if (collectionName === "labResultRequests" && normalizeStatus(row.paymentStatus, "unpaid") !== "paid") {
    throw new Error("Lab result must be marked paid before release.");
  }
}
