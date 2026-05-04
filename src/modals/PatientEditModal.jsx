import React, { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Save, UserPen, X } from "lucide-react";

// Edits basic patient details when this reusable modal is mounted by a page.
export default function PatientEditModal({ patient, onSave, onClose }) {
  const [form, setForm] = useState(patient);

  useEffect(() => {
    setForm(patient);
  }, [patient]);

  if (!patient || !form) return null;

  // Normalizes patient name and case number before handing the form back to the parent.
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      name: form.name.trim(),
      caseNumber: form.caseNumber.trim().toUpperCase(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <Motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
        className="mrs-panel relative w-full max-w-lg overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-green-100 bg-green-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-600 text-white">
              <UserPen size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-800 uppercase">Edit Patient</h2>
              <p className="text-xs font-bold text-slate-500">{form.caseNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Patient Name</label>
            <input
              className="mrs-field w-full p-4 rounded-xl font-bold"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Case Number</label>
            <input
              className="mrs-field w-full p-4 rounded-xl font-mono font-bold"
              value={form.caseNumber}
              onChange={(e) => setForm({ ...form, caseNumber: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Admission</label>
              <input
                type="date"
                className="mrs-field w-full p-3 rounded-xl font-bold"
                value={form.admissionDate || ""}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Discharge</label>
              <input
                type="date"
                className="mrs-field w-full p-3 rounded-xl font-bold"
                value={form.dischargeDate || ""}
                onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Care Type</label>
            <select
              className="mrs-field w-full p-4 rounded-xl font-bold"
              value={form.type || "outpatient"}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="outpatient">Outpatient</option>
              <option value="inpatient">Inpatient</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row">
          <button type="button" onClick={onClose} className="flex-1 py-3 font-black uppercase text-slate-500">
            Cancel
          </button>
          <button className="mrs-primary-button flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase">
            <Save size={18} />
            Save
          </button>
        </div>
      </Motion.form>
    </div>
  );
}
