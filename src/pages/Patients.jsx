import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Barcode from "react-barcode";
import { v4 as uuidv4 } from "uuid";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  FileText,
  Download,
  UploadCloud,
  FileCheck,
  Eye,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Paperclip,
  Printer,
  Search
} from "lucide-react";

export default function Patients() {
  const initialPatients = [
    { id: uuidv4(), name: "Juan Dela Cruz", caseNumber: "CN-2026-001", type: "inpatient", isNew: false, fileName: "chart_001.pdf" },
    { id: uuidv4(), name: "Maria Santos", caseNumber: "CN-2026-002", type: "outpatient", isNew: true, fileName: null },
  ];

  const [patients, setPatients] = useState(initialPatients);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", caseNumber: "", type: "outpatient", file: null });

  // MODAL STATES
  const [viewPatient, setViewPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);

  // BARCODE DOWNLOAD LOGIC
  const downloadBarcode = (caseNumber) => {
    const canvas = document.createElement("canvas");
    const svg = document.getElementById(`barcode-${caseNumber}`);
    if (!svg) return;
    
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
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Barcode-${caseNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = image64;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.caseNumber) return;
    const newPatient = {
      id: uuidv4(),
      name: form.name,
      caseNumber: form.caseNumber,
      type: form.type,
      isNew: true,
      fileName: form.file ? form.file.name : null,
    };
    setPatients([newPatient, ...patients]);
    setForm({ name: "", caseNumber: "", type: "outpatient", file: null });
  };

  const handleDelete = (id) => {
    setPatients(patients.filter((p) => p.id !== id));
    setDeletePatient(null);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setPatients(patients.map((p) => (p.id === editPatient.id ? editPatient : p)));
    setEditPatient(null);
  };

  const filteredPatients = patients.filter((p) => {
    const matchesFilter = filter === "all" 
      ? true 
      : filter === "new" ? p.isNew : filter === "old" ? !p.isNew : p.type === filter;
    
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout>
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            Patient <span className="text-green-700">Registry</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Manage medical records and digital charts</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search name or case #..."
              className="pl-10 pr-4 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* ADD PATIENT FORM */}
        <div className="xl:col-span-1">
          <Motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] sticky top-24"
          >
            <div className="flex items-center gap-2 mb-6 text-green-700">
              <UserPlus size={24} />
              <h2 className="font-black text-xl uppercase italic">Quick Add</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                <input
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Case Number</label>
                <input
                  placeholder="CN-2026-XXX"
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                  value={form.caseNumber}
                  onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type</label>
                <select
                  className="w-full border-2 border-black p-3 rounded-xl outline-none font-bold bg-white"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="inpatient">Inpatient</option>
                  <option value="outpatient">Outpatient</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Chart Scan</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-black transition-colors bg-slate-50 overflow-hidden">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                  />
                  {form.file ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xs">
                      <FileCheck size={16} /> {form.file.name}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <UploadCloud size={20} />
                      <span className="text-[10px] font-bold uppercase">Upload Chart</span>
                    </div>
                  )}
                </div>
              </div>

              <button className="w-full bg-green-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_0_#14532d] active:shadow-none active:translate-y-1 transition-all mt-4">
                Register Record
              </button>
            </form>
          </Motion.div>
        </div>

        {/* REGISTRY TABLE */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b-2 border-black">
                    <th className="p-4">Patient Information</th>
                    <th className="p-4">Scanned File</th>
                    <th className="p-4">Case Barcode</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filteredPatients.map((p) => (
                      <Motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-green-50/30 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="font-black text-slate-800 uppercase tracking-tight">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase">{p.caseNumber}</span>
                            <span className={`text-[9px] font-black uppercase ${p.type === 'inpatient' ? 'text-purple-500' : 'text-blue-500'}`}>
                              • {p.type}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          {p.fileName ? (
                            <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
                              <FileText size={14} className="text-slate-500" />
                              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{p.fileName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic uppercase tracking-widest">No File</span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 border border-slate-200 rounded-lg">
                              <Barcode id={`barcode-${p.caseNumber}`} value={p.caseNumber} height={25} width={1} fontSize={10} background="transparent" />
                            </div>
                            <button 
                              onClick={() => downloadBarcode(p.caseNumber)}
                              className="p-1.5 bg-green-100 hover:bg-green-600 text-green-700 hover:text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                            >
                              <Download size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setViewPatient(p)} className="p-2 hover:bg-black hover:text-white rounded-lg transition-colors border-2 border-transparent">
                              <Eye size={18} />
                            </button>
                            <button onClick={() => setEditPatient(p)} className="p-2 hover:bg-black hover:text-white rounded-lg transition-colors border-2 border-transparent text-slate-400">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => setDeletePatient(p)} className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-colors border-2 border-transparent text-red-400">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </Motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS SECTION */}
      <AnimatePresence>
        {/* VIEW MODAL - Uses viewPatient */}
        {viewPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-2 border-black rounded-3xl p-8 max-w-md w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative">
              <button onClick={() => setViewPatient(null)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
              <h2 className="text-2xl font-black uppercase mb-6 text-green-700 italic tracking-tight">Patient File</h2>
              <div className="space-y-4">
                <div className="border-b-2 border-slate-100 pb-2">
                  <p className="text-[10px] font-black uppercase text-slate-400">Full Name</p>
                  <p className="font-black text-slate-800 text-lg">{viewPatient.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Case ID</p>
                    <p className="font-bold text-slate-800">{viewPatient.caseNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Status</p>
                    <p className="font-bold text-green-600 uppercase italic">{viewPatient.type}</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-black flex flex-col items-center">
                   <Barcode id={`barcode-view-${viewPatient.caseNumber}`} value={viewPatient.caseNumber} />
                   <button onClick={() => downloadBarcode(`view-${viewPatient.caseNumber}`)} className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase bg-white border border-black px-4 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                     <Printer size={12}/> Print Barcode
                   </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}

        {/* EDIT MODAL - Uses setEditPatient */}
        {editPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-black rounded-3xl p-8 max-w-md w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2"><Edit/> Edit Record</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Name</label>
                  <input className="w-full border-2 border-black p-3 rounded-xl font-bold" value={editPatient.name} onChange={(e) => setEditPatient({...editPatient, name: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditPatient(null)} className="flex-1 py-3 border-2 border-black rounded-xl font-bold uppercase text-xs">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-green-700 text-white rounded-xl font-black uppercase text-xs shadow-[0_4px_0_0_#14532d]">Update</button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}

        {/* DELETE CONFIRMATION - Uses deletePatient & handleDelete */}
        {deletePatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white border-2 border-black rounded-3xl p-8 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-600">
                <AlertCircle size={32}/>
              </div>
              <h2 className="text-xl font-black uppercase mb-2">Delete Record?</h2>
              <p className="text-slate-500 text-sm mb-6">Action is permanent for "{deletePatient.name}".</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletePatient(null)} className="flex-1 py-3 border-2 border-black rounded-xl font-black uppercase text-xs">Cancel</button>
                <button onClick={() => handleDelete(deletePatient.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs shadow-[0_4px_0_0_#991b1b]">Delete</button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}