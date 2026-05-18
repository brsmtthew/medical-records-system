import { motion as Motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function PatientDeleteModal({
  canDeletePatients,
  isDeleting,
  onCancel,
  onConfirm,
  patient,
}) {
  return (
    <AnimatePresence>
      {canDeletePatients && patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative w-full max-w-md overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-xl border border-red-100 bg-white/80 text-red-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              aria-label="Close delete patient"
            >
              <X size={17} />
            </button>

            <div className="border-b border-red-100 bg-red-50 p-5 pr-16">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                  <Trash2 size={24} />
                </div>
                <div>
                  <p className="text-lg font-black uppercase text-red-900">Delete Patient Record</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-red-700">
                    This removes the patient registry row. Review the case number before confirming.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient</p>
                <p className="mt-1 break-words text-base font-black uppercase text-slate-900">{patient.name}</p>
                <p className="mt-1 font-mono text-xs font-black uppercase text-green-800">{patient.caseNumber}</p>
              </div>

              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">
                  Deleting is permanent for this patient row. Use edit if you only need to correct a name, case number, or date.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button onClick={onCancel} disabled={isDeleting} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-70">
                  Cancel
                </button>
                <button onClick={() => onConfirm(patient.caseNumber)} disabled={isDeleting} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70">
                  <Trash2 size={17} />
                  {isDeleting ? "Deleting..." : "Delete Record"}
                </button>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
