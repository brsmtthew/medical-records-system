import React from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ children, isOpen, onClose, title, className = "" }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <Motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className={`mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl p-5 ${className}`}
          >
            {title && <h2 className="pr-10 text-xl font-black uppercase text-slate-800">{title}</h2>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            )}
            {children}
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
