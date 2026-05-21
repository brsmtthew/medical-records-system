import { motion as Motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ClipboardList, Send, XCircle } from "lucide-react";

const statusLabels = {
  preparing: "Prepare",
  ready: "Ready",
  received: "Received",
  completed: "Complete",
  canceled: "Cancel",
};

export default function ChartRequestConfirmModal({
  action,
  isSaving,
  onCancel,
  onConfirm,
}) {
  return (
    <AnimatePresence>
      {action && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <Motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 sm:p-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex size-12 items-center justify-center rounded-2xl ${
                action.type === "cancel"
                  ? "bg-red-50 text-red-600"
                  : action.type === "submit"
                    ? "bg-green-50 text-green-700"
                    : "bg-blue-50 text-blue-700"
              }`}>
                {action.type === "submit" ? (
                  <Send size={23} />
                ) : action.type === "cancel" ? (
                  <XCircle size={24} />
                ) : action.status === "received" ? (
                  <ClipboardList size={24} />
                ) : (
                  <CheckCircle2 size={24} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900">
                  {action.type === "submit" ? "Send Chart Request?" : `${statusLabels[action.status] || "Update"} Request?`}
                </h3>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Review request details before saving
                </p>
              </div>
            </div>

            <div className="mb-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chart</p>
                <p className="break-words text-base font-black uppercase text-slate-900">{action.patientName}</p>
                <p className="mt-1 font-mono text-sm font-black text-green-800">{action.caseNumber}</p>
              </div>

              {action.purpose && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose</p>
                  <p className="break-words text-sm font-bold text-slate-700">{action.purpose}</p>
                </div>
              )}

              {action.status && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Status</p>
                  <p className="text-sm font-black uppercase text-slate-800">{action.status}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSaving}
                className={`rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${
                  action.type === "cancel"
                    ? "bg-red-600 shadow-red-600/20"
                    : "mrs-primary-button"
                }`}
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
