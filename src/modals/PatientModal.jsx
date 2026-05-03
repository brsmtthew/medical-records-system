import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function PatientModal({ isOpen, onClose, title = "Patient Record", children }) {
  return (
    <AnimatePresence>
      {isOpen && (
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
            className="mrs-panel relative w-full max-w-xl overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="font-black text-slate-800 uppercase">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
