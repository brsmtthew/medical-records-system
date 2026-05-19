import { Edit, Plus, Trash2 } from "lucide-react";

const actionCopy = {
  add: {
    icon: Plus,
    tone: "bg-green-50 text-green-700",
    button: "bg-green-700 shadow-green-700/20",
    verb: "Add",
  },
  update: {
    icon: Edit,
    tone: "bg-blue-50 text-blue-700",
    button: "bg-blue-700 shadow-blue-700/20",
    verb: "Update",
  },
  delete: {
    icon: Trash2,
    tone: "bg-red-50 text-red-600",
    button: "bg-red-600 shadow-red-500/20",
    verb: "Delete",
  },
};

export default function DepartmentEditorConfirmModal({
  action,
  isSaving,
  onCancel,
  onConfirm,
}) {
  if (!action) return null;

  const copy = actionCopy[action.type] || actionCopy.update;
  const Icon = copy.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isSaving ? undefined : onCancel}
      />
      <div className="mrs-panel relative w-full max-w-md rounded-2xl p-6">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${copy.tone}`}>
          <Icon size={26} />
        </div>
        <h2 className="text-xl font-black uppercase text-slate-800">{action.title}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          {action.message}
        </p>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</p>
          <p className="mt-1 break-words text-sm font-black text-slate-800">{action.name}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={`rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${copy.button}`}
          >
            {isSaving ? "Saving..." : copy.verb}
          </button>
        </div>
      </div>
    </div>
  );
}
