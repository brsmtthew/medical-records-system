import { motion as Motion, AnimatePresence } from "framer-motion";
import { FolderOpen } from "lucide-react";

export default function ChartFolderLoadModal({
  confirmLabel = "Load",
  description,
  fileCount,
  isOpen,
  onCancel,
  onConfirm,
  subtitle,
  title = "Load Chart Folder?",
}) {
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
            className="mrs-panel relative w-full max-w-md rounded-2xl p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <FolderOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase">{title}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  {subtitle || `${fileCount} selected file(s)`}
                </p>
              </div>
            </div>
            <p className="mb-6 text-sm font-semibold text-slate-500">
              {description || "This will replace the current local chart preview list."}
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
                {confirmLabel}
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
