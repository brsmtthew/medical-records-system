import { motion as Motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";

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
          <Motion.div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <Motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 sm:p-7"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-green-50 text-green-700 rounded-2xl">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase">Add Patient Record?</h3>
                <p className="text-xs font-bold text-slate-400 uppercase">Please review before saving</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Patient</p>
                <p className="font-black text-slate-900 uppercase">{patient.name}</p>
                <p className="font-mono text-sm font-black text-green-800">{patient.caseNumber}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Record</p>
                  <p className="font-black text-slate-800 uppercase">
                    {patient.recordType === "old" ? "Old / Readmission" : "First Admission"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {patient.type === "inpatient" ? "Admitted Location" : "Outpatient Department"}
                  </p>
                  <p className="font-black text-slate-800 uppercase">{patient.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Type</p>
                  <p className="font-black text-slate-800 uppercase">{patient.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Admission</p>
                  <p className="font-black text-slate-800">{patient.admissionDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Discharge</p>
                  <p className="font-black text-slate-800">{patient.dischargeDate}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 py-3 font-black text-gray-500 uppercase"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isSaving}
                className="mrs-primary-button flex-1 py-3 rounded-xl font-black uppercase disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
