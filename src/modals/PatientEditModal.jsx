import React, { useEffect, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Save, UserPen, X } from "lucide-react";

export default function PatientEditModal({ patient, onSave, onClose }) {
  const [form, setForm] = useState(patient);

  useEffect(() => {
    setForm(patient);
  }, [patient]);

  if (!patient || !form) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      name: form.name.trim(),
      caseNumber: form.caseNumber.trim().toUpperCase(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <Motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
        className="relative bg-white w-full max-w-lg rounded-3xl border-4 border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden"
      >
        <div className="px-6 py-4 border-b-2 border-black bg-green-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-600 text-white border-2 border-black">
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
              className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none focus:ring-2 focus:ring-green-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Case Number</label>
            <input
              className="w-full border-2 border-black p-4 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full border-2 border-black p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-green-500"
                value={form.admissionDate || ""}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Discharge</label>
              <input
                type="date"
                className="w-full border-2 border-black p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-green-500"
                value={form.dischargeDate || ""}
                onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Care Type</label>
            <select
              className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none bg-white focus:ring-2 focus:ring-green-500"
              value={form.type || "outpatient"}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="outpatient">Outpatient</option>
              <option value="inpatient">Inpatient</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t-2 border-black bg-slate-50 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 font-black uppercase text-slate-500">
            Cancel
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white border-2 border-black py-3 rounded-xl font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
            <Save size={18} />
            Save
          </button>
        </div>
      </Motion.form>
    </div>
  );
}
