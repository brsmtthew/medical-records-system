const chartRequestTransitions = {
  // The review step was removed: a submitted request goes straight to preparing.
  pending: new Set(["preparing", "canceled"]),
  // Kept only so any legacy request already in "reviewing" can still be resolved.
  reviewing: new Set(["preparing", "canceled"]),
  preparing: new Set(["ready", "canceled"]),
  // Pickup lands the chart straight into review (the requester reviews it before
  // returning); "received" is kept for any legacy request still parked there.
  ready: new Set(["received", "inReview"]),
  received: new Set(["inReview", "returned"]),
  inReview: new Set(["returned"]),
  returned: new Set(["returnReceived"]),
  returnReceived: new Set(["completed"]),
  completed: new Set([]),
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
