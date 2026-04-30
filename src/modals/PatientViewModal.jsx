import React from "react";
import { motion as Motion } from "framer-motion";
import { CalendarDays, ClipboardList, UserCircle, X } from "lucide-react";

export default function PatientViewModal({ patient, onClose }) {
  if (!patient) return null;

  const details = [
    { label: "Case Number", value: patient.caseNumber },
    { label: "Care Type", value: patient.type || "N/A" },
    { label: "Admission", value: patient.admissionDate || "N/A" },
    { label: "Discharge", value: patient.dischargeDate || "Ongoing" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <Motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
        className="relative bg-white w-full max-w-md rounded-3xl border-4 border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden"
      >
        <div className="p-6 bg-green-50 border-b-2 border-black">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          <div className="size-16 rounded-2xl bg-green-700 text-white border-2 border-black flex items-center justify-center mb-4">
            <UserCircle size={34} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase leading-tight">
            {patient.name}
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase mt-1">
            {patient.dischargeDate ? "Discharged Record" : "Active Record"}
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {details.map((item) => (
            <div key={item.label} className="bg-slate-50 border-2 border-black rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                {item.label.includes("Date") || item.label === "Admission" || item.label === "Discharge" ? (
                  <CalendarDays size={15} />
                ) : (
                  <ClipboardList size={15} />
                )}
                <p className="text-[10px] font-black uppercase">{item.label}</p>
              </div>
              <p className="font-black text-slate-800 capitalize">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-3 rounded-xl font-black uppercase text-xs"
          >
            Close
          </button>
        </div>
      </Motion.div>
    </div>
  );
}
