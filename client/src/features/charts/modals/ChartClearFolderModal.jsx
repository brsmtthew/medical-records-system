import { motion as Motion, AnimatePresence } from "framer-motion";
import { FolderOpen } from "lucide-react";

export default function ChartClearFolderModal({ isOpen, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45"
            onClick={onCancel}
          />
          <Motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FolderOpen size={26} />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase">Clear Folder?</h2>
            <p className="mt-2 mb-6 text-sm font-semibold text-slate-500">
              This will remove the current local previews from this screen.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="mrs-blue-button rounded-xl py-3 text-xs font-black uppercase"
              >
                Clear
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
