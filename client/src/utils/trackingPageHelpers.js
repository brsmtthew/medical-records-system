import { formatDisplayDate } from "./dateFormatting";
import { recordTimeValue } from "./recordSorting";

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

export function trackingDateColumn(label, key, width) {
  return {
    label,
    width,
    wrap: true,
    value: (row) => {
      const time = recordTimeValue(row[key]);
      if (!time) return "N/A";

      const date = new Date(time);
      const datePart = formatDisplayDate(time);
      const timePart = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${datePart}\n${timePart}`;
    },
  };
}

export function trackingDateRangeColumn(label, firstLabel, firstKey, secondLabel, secondKey, width) {
  return {
    label,
    width,
    wrap: true,
    value: (row) => {
      const formatPart = (key) => {
        const time = recordTimeValue(row[key]);
        if (!time) return "N/A";

        const date = new Date(time);
        const datePart = formatDisplayDate(time);
        const timePart = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        return `${datePart} ${timePart}`;
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

      const date = new Date(time);
      const datePart = date.toISOString().slice(0, 10);
      const timePart = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${datePart}\n${timePart}`;
    },
  };
}
