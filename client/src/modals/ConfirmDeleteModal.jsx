import React from "react";
import { motion as Motion } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

// Shows the final confirmation before a patient record is deleted.
export default function ConfirmDeleteModal({ patient, onConfirm, onClose }) {
  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <Motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
        className="mrs-panel relative w-full max-w-sm overflow-hidden rounded-2xl text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          <div className="size-18 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={34} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase">Delete Record?</h2>
          <p className="text-sm font-semibold text-slate-500 mt-3 leading-relaxed">
            This will remove <span className="font-black text-slate-900">{patient.name}</span> from
            the current patient list.
          </p>
        </div>

        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-black uppercase text-xs text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-red-600/20"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </Motion.div>
    </div>
  );
}
