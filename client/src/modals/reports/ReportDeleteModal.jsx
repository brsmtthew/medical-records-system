import { CircleAlert } from "lucide-react";

export default function ReportDeleteModal({
  isDeleting,
  log,
  onCancel,
  onConfirm,
}) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-7">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <CircleAlert size={30} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">Delete Report Row?</h2>
        <p className="text-sm font-semibold text-slate-500 mt-2 mb-7">
          This removes the audit row for {log.caseNumber || "this chart"}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase shadow-lg shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
