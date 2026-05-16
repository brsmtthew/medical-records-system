import React from "react";

export default function PatientCaseCell({
  caseNumber,
  className = "",
  patientName,
}) {
  return (
    <div className={className}>
      <p className="break-words text-sm font-black uppercase leading-tight text-slate-800">
        {patientName || "N/A"}
      </p>
      <p className="mt-1 break-words font-mono text-[11px] font-black leading-tight tracking-wide text-green-700">
        {caseNumber || "N/A"}
      </p>
    </div>
  );
}
