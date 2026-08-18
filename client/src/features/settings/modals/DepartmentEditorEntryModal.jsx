import { useState } from "react";
import { Plus, X } from "lucide-react";

export default function DepartmentEditorEntryModal({
  isOpen,
  label,
  onCancel,
  onSubmit,
  placeholder,
  title,
}) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const shouldClose = onSubmit(name);
    if (shouldClose !== false) setName("");
  };

  const handleCancel = () => {
    setName("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="mrs-panel relative w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            <Plus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-slate-800">{title}</h2>
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close add department"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={placeholder}
              className="mrs-field w-full rounded-xl p-3 font-bold"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-green-700/20"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
