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
  voided: "mrs-status-voided",
};

export default function StatusBadge({ children, className = "", tone = "neutral" }) {
  return (
    <span className={`mrs-status-badge ${toneClasses[tone] || toneClasses.neutral} ${className}`}>
      {children}
    </span>
  );
}
