import { CircleAlert, LoaderCircle } from "lucide-react";

export default function ReportDeleteModal({
  isDeleting,
  log,
  onCancel,
  onConfirm,
}) {
  if (!log) return null;

  const willVoid = log.action === "returned";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-7">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <CircleAlert size={30} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">
          {willVoid ? "Void Report Row?" : "Delete Report Row?"}
        </h2>
        <p className="text-sm font-semibold text-slate-500 mt-2 mb-7">
          {willVoid
            ? `This completed transaction for ${log.caseNumber || "this chart"} stays in the report and is marked voided.`
            : `This removes the audit row for ${log.caseNumber || "this chart"}.`}
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-black uppercase text-white shadow-lg shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting && <LoaderCircle size={16} className="animate-spin" />}
            {isDeleting ? (willVoid ? "Voiding..." : "Deleting...") : (willVoid ? "Void" : "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
