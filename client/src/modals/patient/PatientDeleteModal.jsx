import { motion as Motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

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
          <Motion.div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <Motion.div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-10">
            <div className="size-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Trash2 size={34} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Delete?</h3>
            <p className="text-gray-500 font-bold text-sm mb-10 leading-tight">Are you sure you want to remove <span className="text-black">{patient.name}</span>?</p>
            <div className="flex gap-4">
              <button onClick={onCancel} disabled={isDeleting} className="flex-1 py-4 font-black text-gray-400 uppercase">No</button>
              <button onClick={() => onConfirm(patient.caseNumber)} disabled={isDeleting} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black shadow-lg shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-70">{isDeleting ? "Deleting..." : "Yes"}</button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
