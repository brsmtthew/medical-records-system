import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Barcode from "react-barcode";
import { v4 as uuidv4 } from "uuid";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Search,
  Download,
  ClipboardList,
  Save,
  ArrowRight
} from "lucide-react";

export default function Patients() {
  const initialPatients = [
    { 
      id: uuidv4(), 
      name: "Juan Dela Cruz", 
      caseNumber: "CN-2026-001", 
      type: "inpatient", 
      admissionDate: "2026-04-01",
      dischargeDate: "2026-04-10"
    },
    { 
      id: uuidv4(), 
      name: "Maria Santos", 
      caseNumber: "CN-2026-002", 
      type: "outpatient", 
      admissionDate: "2026-04-20",
      dischargeDate: ""
    },
  ];

  const [patients, setPatients] = useState(initialPatients);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ 
    name: "", caseNumber: "", type: "outpatient", admissionDate: "", dischargeDate: "" 
  });

  const [viewPatient, setViewPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.caseNumber) return;
    const newPatient = { ...form, id: uuidv4() };
    setPatients([newPatient, ...patients]);
    setForm({ name: "", caseNumber: "", type: "outpatient", admissionDate: "", dischargeDate: "" });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setPatients(patients.map((p) => (p.id === editPatient.id ? editPatient : p)));
    setEditPatient(null);
  };

  const handleDelete = (id) => {
    setPatients(patients.filter((p) => p.id !== id));
    setDeletePatient(null);
  };

  const downloadBarcode = (caseNumber) => {
    const svg = document.getElementById(`barcode-${caseNumber}`);
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(xml);
    const image64 = "data:image/svg+xml;base64," + svg64;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `Barcode-${caseNumber}.png`;
      link.click();
    };
    img.src = image64;
  };

  const filteredPatients = patients.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-10 px-2">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            Patient <span className="text-green-600">Registry</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Hospital Records & Management</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
          <input
            placeholder="Search records..."
            className="w-full border-2 border-black bg-white pl-12 pr-4 py-3.5 rounded-2xl focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT: REGISTRATION FORM WITH BLACK BORDER */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-100 border-2 border-black text-black rounded-2xl">
                <UserPlus size={24} />
              </div>
              <h2 className="font-black text-xl text-gray-900 uppercase tracking-tight">Register</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Patient Name</label>
                <input
                  className="w-full border-2 border-black p-4 rounded-xl bg-gray-50 focus:bg-white transition-all outline-none text-sm font-bold"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Case ID</label>
                <input
                  className="w-full border-2 border-black p-4 rounded-xl bg-gray-50 focus:bg-white transition-all outline-none font-mono text-sm font-bold"
                  value={form.caseNumber}
                  onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                  placeholder="CN-2026-000"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admission</label>
                  <input
                    type="date"
                    className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 outline-none text-xs font-bold"
                    value={form.admissionDate}
                    onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Discharge</label>
                  <input
                    type="date"
                    className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 outline-none text-xs font-bold"
                    value={form.dischargeDate}
                    onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Care Status</label>
                <select
                  className="w-full border-2 border-black p-4 rounded-xl bg-gray-50 outline-none text-sm font-bold cursor-pointer"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                </select>
              </div>

              <button className="w-full bg-green-500 hover:bg-green-600 border-2 border-black text-black py-4 rounded-xl font-black transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 mt-4">
                ADD RECORD <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: TABLE WITH BLACK BORDERS ON ROWS */}
        <div className="lg:col-span-8">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left">
                  <th className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                  <th className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
                  <th className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="bg-white transition-all">
                    <td className="px-6 py-5 rounded-l-2xl border-y-2 border-l-2 border-black shadow-[0px_4px_0px_0px_rgba(0,0,0,0.05)]">
                      <div className="font-black text-gray-900 text-base">{p.name}</div>
                      <code className="text-[10px] font-mono text-green-700 font-bold">{p.caseNumber}</code>
                    </td>
                    <td className="px-6 py-5 border-y-2 border-black">
                      <div className="text-[11px] font-black text-gray-700">IN: {p.admissionDate || "--"}</div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase">OUT: {p.dischargeDate || "Active"}</div>
                    </td>
                    <td className="px-6 py-5 border-y-2 border-black">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black ${
                        p.type === 'inpatient' ? 'bg-indigo-400 text-white' : 'bg-orange-400 text-white'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-5 rounded-r-2xl border-y-2 border-r-2 border-black text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewPatient(p)} className="p-2 border-2 border-transparent hover:border-black hover:bg-gray-50 rounded-xl transition-all">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => setEditPatient(p)} className="p-2 border-2 border-transparent hover:border-black hover:bg-gray-50 rounded-xl transition-all">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => setDeletePatient(p)} className="p-2 border-2 border-transparent hover:border-black hover:bg-red-50 text-red-500 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL - FULL FUNCTIONALITY RESTORED */}
      <AnimatePresence>
        {editPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditPatient(null)} />
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg p-8 rounded-[2.5rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]" >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-400 border-2 border-black rounded-xl"><Edit size={24} /></div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Update Record</h2>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Name</label>
                    <input className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none focus:bg-gray-50" value={editPatient.name} onChange={(e) => setEditPatient({ ...editPatient, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Case Number</label>
                    <input className="w-full border-2 border-black p-4 rounded-xl font-mono font-bold outline-none focus:bg-gray-50" value={editPatient.caseNumber} onChange={(e) => setEditPatient({ ...editPatient, caseNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Admission</label>
                    <input type="date" className="w-full border-2 border-black p-3 rounded-xl font-bold" value={editPatient.admissionDate} onChange={(e) => setEditPatient({ ...editPatient, admissionDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Discharge</label>
                    <input type="date" className="w-full border-2 border-black p-3 rounded-xl font-bold" value={editPatient.dischargeDate} onChange={(e) => setEditPatient({ ...editPatient, dischargeDate: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Care Status</label>
                    <select className="w-full border-2 border-black p-4 rounded-xl font-bold" value={editPatient.type} onChange={(e) => setEditPatient({ ...editPatient, type: e.target.value })}>
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setEditPatient(null)} className="flex-1 py-4 font-black text-gray-500 uppercase">Cancel</button>
                  <button type="submit" className="flex-1 bg-amber-400 text-black border-2 border-black py-4 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 flex items-center justify-center gap-2">
                    <Save size={20} /> Save Changes
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {viewPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setViewPatient(null)} />
            <Motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="relative bg-white w-full max-w-md p-10 rounded-[3rem] border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-center" >
                <div className="size-20 bg-green-100 border-2 border-black text-black rounded-[2rem] flex items-center justify-center mx-auto mb-6"><ClipboardList size={38} /></div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{viewPatient.name}</h2>
                <p className="text-gray-500 font-mono font-bold text-sm mb-8">{viewPatient.caseNumber}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Admission</p>
                    <p className="font-black text-gray-900">{viewPatient.admissionDate || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Discharge</p>
                    <p className="font-black text-gray-900">{viewPatient.dischargeDate || "Ongoing"}</p>
                  </div>
                </div>

                <div className="p-6 bg-white border-2 border-black rounded-2xl mb-8 flex justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                   <Barcode id={`barcode-${viewPatient.caseNumber}`} value={viewPatient.caseNumber} width={1.8} height={60} fontSize={14} />
                </div>
                
                <button onClick={() => downloadBarcode(viewPatient.caseNumber)} className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-black hover:bg-gray-900 transition-all shadow-[4px_4px_0px_0px_rgba(0,255,0,0.3)]" >
                  <Download size={20} /> Download PNG
                </button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {deletePatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div className="absolute inset-0 bg-black/40" onClick={() => setDeletePatient(null)} />
            <Motion.div className="relative bg-white p-10 rounded-[2.5rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full text-center">
              <div className="size-20 bg-red-100 border-2 border-black text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={34} /></div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Delete?</h3>
              <p className="text-gray-500 font-bold text-sm mb-10 leading-tight">Are you sure you want to remove <span className="text-black">{deletePatient.name}</span>?</p>
              <div className="flex gap-4">
                <button onClick={() => setDeletePatient(null)} className="flex-1 py-4 font-black text-gray-400 uppercase">No</button>
                <button onClick={() => handleDelete(deletePatient.id)} className="flex-1 py-4 bg-red-500 text-white border-2 border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">Yes</button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}