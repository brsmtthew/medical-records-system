import { recordTimeValue } from "./recordSorting";

// Converts supported record timestamp shapes into the display timestamp used across tables and dashboard labels.
export function formatDisplayDate(value) {
  const time = recordTimeValue(value);
  if (!time) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(time)).toUpperCase();
}

// Keeps native date input values readable in nearby report labels.
export function formatDateInputLabel(value) {
  if (!value) return "N/A";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "N/A";

  return formatDisplayDate(new Date(year, month - 1, day));
}

// Keeps native month input values readable without inventing a fake day in the UI.
export function formatMonthInputLabel(value) {
  if (!value) return "N/A";

  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1)).toUpperCase();
}
