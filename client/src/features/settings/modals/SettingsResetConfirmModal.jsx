import { RotateCcw } from "lucide-react";

export default function SettingsResetConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <RotateCcw size={26} />
        </div>
        <h2 className="text-xl font-black uppercase text-slate-800">Restore Defaults?</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          This will reset the system settings values to their defaults.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-amber-500 px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-amber-500/20"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
