import { motion as Motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";

export default function PatientCreateConfirmModal({
  canManagePatients,
  isSaving,
  onCancel,
  onConfirm,
  patient,
}) {
  return (
    <AnimatePresence>
      {canManagePatients && patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} />
          <Motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-hidden rounded-2xl"
          >
            <div className="border-b border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900">Add Patient Record?</h3>
                  <p className="text-xs font-bold text-slate-500">Please review before saving.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge tone={patient.type === "inpatient" ? "inpatient" : "outpatient"}>{patient.type}</StatusBadge>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                    patient.recordType === "old"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}>
                    {patient.recordType === "old" ? "Old / Readmission" : "First Admission"}
                  </span>
                </div>
                <p className="break-words text-base font-black uppercase text-slate-900">{patient.name}</p>
                <p className="mt-1 font-mono text-xs font-black text-green-800">{patient.caseNumber}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: patient.type === "inpatient" ? "Admitted Location" : "Outpatient Department", value: patient.department },
                  { label: "Admission", value: patient.admissionDate },
                  { label: "Discharge", value: patient.dischargeDate },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-black uppercase text-slate-800">{item.value || "N/A"}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={onCancel}
                  disabled={isSaving}
                  className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSaving}
                  className="mrs-primary-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
