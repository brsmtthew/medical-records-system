import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { recordTimeValue } from "@shared/utils/recordSorting";

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function nowLocalKey() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function formatTrackingDateTime(value) {
  const time = recordTimeValue(value);
  return time ? formatDisplayDate(time) : "N/A";
}

export function formatTrackingDateOnly(value) {
  if (!value) return "N/A";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return formatDisplayDate(new Date(year, month - 1, day));
  }

  const time = recordTimeValue(value);
  return time ? formatDisplayDate(time) : "N/A";
}

export function formatTrackingDateTimeWithTime(value) {
  const time = recordTimeValue(value);
  return time ? formatDisplayDate(time) : "N/A";
}

export function trackingDateColumn(label, key, width) {
  return {
    label,
    width,
    wrap: true,
    value: (row) => {
      const time = recordTimeValue(row[key]);
      if (!time) return "N/A";

      return formatDisplayDate(time);
    },
  };
}

export function trackingDateRangeColumn(label, firstLabel, firstKey, secondLabel, secondKey, width) {
  return {
    label,
    width,
    wrap: true,
    dateRange: {
      firstKey,
      firstLabel,
      secondKey,
      secondLabel,
    },
    value: (row) => {
      const formatPart = (key) => {
        return formatTrackingDateTimeWithTime(row[key]);
      };

      return `${firstLabel}: ${formatPart(firstKey)}\n${secondLabel}: ${formatPart(secondKey)}`;
    },
  };
}

export function trackingDateTimeColumn(label, key, width) {
  return {
    label,
    width,
    wrap: true,
    value: (row) => {
      const time = recordTimeValue(row[key]);
      if (!time) return "N/A";

      return formatDisplayDate(time);
    },
  };
}
