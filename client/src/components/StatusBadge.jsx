import React from "react";

const toneClasses = {
  available: "mrs-status-available",
  borrowed: "mrs-status-borrowed",
  inpatient: "mrs-status-inpatient",
  outpatient: "mrs-status-outpatient",
  success: "mrs-status-success",
  warning: "mrs-status-warning",
  danger: "mrs-status-danger",
  neutral: "mrs-status-neutral",
};

export default function StatusBadge({ children, className = "", tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${toneClasses[tone] || toneClasses.neutral} ${className}`}>
      {children}
    </span>
  );
}
