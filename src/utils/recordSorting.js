// Converts Firestore, Date, and string timestamps into sortable millisecond values.
export function recordTimeValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Finds the most recent activity timestamp available on a record row.
export function latestRecordTime(row) {
  return Math.max(
    recordTimeValue(row.updatedAt),
    recordTimeValue(row.returnedAt),
    recordTimeValue(row.borrowedAt),
    recordTimeValue(row.timestamp),
    recordTimeValue(row.createdAt),
  );
}

// Sorts records newest-first with a stable id/case-number fallback.
export function sortNewestFirst(rows) {
  return [...rows].sort((first, second) => {
    const timeDifference = latestRecordTime(second) - latestRecordTime(first);
    if (timeDifference !== 0) return timeDifference;

    return String(second.id || second.caseNumber || "").localeCompare(String(first.id || first.caseNumber || ""));
  });
}
