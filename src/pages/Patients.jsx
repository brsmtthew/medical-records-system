import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Barcode from "react-barcode";
import { v4 as uuidv4 } from "uuid";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, Filter, FileText, Download } from "lucide-react";

export default function Patients() {
  const initialPatients = [
    { id: uuidv4(), name: "Juan Dela Cruz", caseNumber: "CN-2026-001", type: "inpatient", isNew: false },
    { id: uuidv4(), name: "Maria Santos", caseNumber: "CN-2026-002", type: "outpatient", isNew: true },
    { id: uuidv4(), name: "Pedro Reyes", caseNumber: "CN-2026-003", type: "inpatient", isNew: false },
    { id: uuidv4(), name: "Ana Lopez", caseNumber: "CN-2026-004", type: "outpatient", isNew: true },
  ];

  const [patients, setPatients] = useState(initialPatients);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ name: "", caseNumber: "", type: "outpatient", file: null });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.caseNumber) return;
    const existingPatient = patients.find(p => p.name.toLowerCase() === form.name.toLowerCase());
    const newPatient = {
      ...form,
      id: uuidv4(),
      isNew: !existingPatient,
    };
    setPatients([newPatient, ...patients]);
    setForm({ name: "", caseNumber: "", type: "outpatient", file: null });
  };

  const filteredPatients = patients.filter((p) => {
    if (filter === "all") return true;
    return filter === "new" ? p.isNew : filter === "old" ? !p.isNew : p.type === filter;
  });

  return (
    <DashboardLayout>
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            Patient <span className="text-green-700">Management</span>
          </h1>
          <p className="text-slate-500 font-medium">Registry and digital chart tracking</p>
        </div>

        <div className="flex bg-white border-2 border-black p-1 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {["all", "inpatient", "outpatient", "new", "old"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                filter === f ? "bg-green-700 text-white" : "text-slate-500 hover:text-black"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ADD PATIENT FORM */}
        <div className="xl:col-span-1">
          <Motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(22,101,52,0.1)] sticky top-24"
          >
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="text-green-700" size={24} />
              <h2 className="font-black text-xl text-slate-800 uppercase">Register Patient</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter patient name"
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 ml-1">Case Number</label>
                <input
                  type="text"
                  placeholder="CN-2026-XXX"
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  value={form.caseNumber}
                  onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 ml-1">Classification</label>
                <select
                  className="w-full border-2 border-black p-3 rounded-xl outline-none appearance-none bg-white"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="inpatient">In-Patient</option>
                  <option value="outpatient">Out-Patient</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1 ml-1">Attachment (Scanned Chart)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-green-500 transition-colors cursor-pointer bg-slate-50">
                   <input type="file" className="hidden" id="file-upload" />
                   <label htmlFor="file-upload" className="cursor-pointer text-sm font-bold text-slate-500">
                     Click to upload PDF/JPG
                   </label>
                </div>
              </div>

              <Motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-green-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_0_rgba(20,83,45,1)] hover:shadow-none hover:translate-y-1 transition-all"
              >
                Save Record
              </Motion.button>
            </form>
          </Motion.div>
        </div>

        {/* PATIENT LIST */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-sm">
            <div className="p-6 border-b-2 border-black bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-xl text-slate-800 uppercase flex items-center gap-2">
                <FileText size={20} /> Registry
              </h2>
              <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                {filteredPatients.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b-2 border-black">
                    <th className="p-4">Patient Information</th>
                    <th className="p-4">Classification</th>
                    <th className="p-4 text-center">Barcode ID</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filteredPatients.map((patient) => (
                      <Motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={patient.id} 
                        className="hover:bg-green-50/50 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="font-black text-slate-800">{patient.name}</div>
                          <div className="text-xs font-bold text-green-700">{patient.caseNumber}</div>
                          <div className={`text-[10px] font-black uppercase mt-1 ${patient.isNew ? 'text-blue-500' : 'text-orange-500'}`}>
                            {patient.isNew ? '● New Admission' : '● Returning'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                            patient.type === 'inpatient' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}>
                            {patient.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center bg-white p-2 border border-slate-200 rounded-lg group-hover:border-black transition-colors">
                            <Barcode value={patient.id.substring(0, 8)} width={1.2} height={30} fontSize={8} />
                          </div>
                        </td>
                        <td className="p-4">
                          <button className="p-2 hover:bg-black hover:text-white rounded-lg transition-all border-2 border-transparent hover:border-black">
                            <Download size={18} />
                          </button>
                        </td>
                      </Motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredPatients.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                  No records found in this category
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}