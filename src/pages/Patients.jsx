import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Barcode from "react-barcode";
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
  ArrowRight,
  Users,
  Bed,
  UserRound,
  X
} from "lucide-react";
import {
  createPatient,
  deletePatient as deletePatientRecord,
  subscribeToPatients,
  updatePatient as updatePatientRecord,
} from "../services/firebaseRecords";

function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

function normalizePatientName(value) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizePatientDates(patient) {
  const admissionDate = patient.admissionDate || "";
  const dischargeDate = patient.type === "outpatient"
    ? admissionDate
    : patient.dischargeDate || "";

  return {
    ...patient,
    admissionDate,
    dischargeDate,
  };
}

function exportPatientsCsv(patients) {
  const headers = ["Patient Name", "Case Number", "Record Type", "Type", "Admission Date", "Discharge Date"];
  const rows = patients.map((patient) =>
    [
      patient.name,
      patient.caseNumber,
      patient.recordType || "new",
      patient.type,
      patient.admissionDate || "",
      patient.dischargeDate || "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "patient-registry.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({ 
    name: "", caseNumber: "", recordType: "new", type: "outpatient", admissionDate: "", dischargeDate: "" 
  });

  const [viewPatient, setViewPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const [confirmPatient, setConfirmPatient] = useState(null);

  const formNameMatchesExistingPatient = patients.some(
    (p) => normalizePatientName(p.name) === normalizePatientName(form.name),
  );

  useEffect(() => {
    return subscribeToPatients(
      (rows) => {
        setPatients(rows);
        setIsLoading(false);
      },
      (error) => {
        setFormError(error.message || "Unable to load patients from Firebase.");
        setIsLoading(false);
      },
    );
  }, []);

  const buildPatientFromForm = () => {
    const caseNumber = normalizeCaseNumber(form.caseNumber);
    if (!form.name.trim() || !caseNumber || !form.admissionDate) {
      setFormError("Enter the patient name, case number, and date.");
      return null;
    }
    if (form.type === "inpatient" && !form.dischargeDate) {
      setFormError("Discharge date is required for inpatient records.");
      return null;
    }
    if (patients.some((p) => normalizeCaseNumber(p.caseNumber) === caseNumber)) {
      setFormError("A patient with this case number already exists.");
      return null;
    }

    const patientName = normalizePatientName(form.name);
    const hasPreviousRecord = patients.some((p) => normalizePatientName(p.name) === patientName);

    return normalizePatientDates({
      ...form,
      name: patientName,
      recordType: hasPreviousRecord ? "old" : "new",
      caseNumber,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newPatient = buildPatientFromForm();
    if (!newPatient) return;
    setConfirmPatient(newPatient);
  };

  const handleConfirmCreate = async () => {
    if (!confirmPatient) return;
    try {
      await createPatient(confirmPatient);
      setForm({ name: "", caseNumber: "", recordType: "new", type: "outpatient", admissionDate: "", dischargeDate: "" });
      setFormError("");
      setConfirmPatient(null);
    } catch (error) {
      setFormError(error.message || "Unable to save patient to Firebase.");
      setConfirmPatient(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const caseNumber = normalizeCaseNumber(editPatient.caseNumber);
    if (!editPatient.name.trim() || !caseNumber || !editPatient.admissionDate) {
      setEditError("Patient name, case number, and date are required.");
      return;
    }
    if (editPatient.type === "inpatient" && !editPatient.dischargeDate) {
      setEditError("Discharge date is required for inpatient records.");
      return;
    }
    const duplicateCase = patients.some(
      (p) => p.id !== editPatient.id && normalizeCaseNumber(p.caseNumber) === caseNumber
    );
    if (duplicateCase) {
      setEditError("Another patient already uses this case number.");
      return;
    }

    const patientName = normalizePatientName(editPatient.name);
    const hasPreviousRecord = patients.some(
      (p) => p.id !== editPatient.id && normalizePatientName(p.name) === patientName,
    );

    try {
      await updatePatientRecord(editPatient.previousCaseNumber || editPatient.id, normalizePatientDates({
        name: patientName,
        caseNumber,
        recordType: hasPreviousRecord ? "old" : editPatient.recordType || "new",
        type: editPatient.type,
        admissionDate: editPatient.admissionDate || "",
        dischargeDate: editPatient.dischargeDate || "",
      }));
      setEditPatient(null);
      setEditError("");
    } catch (error) {
      setEditError(error.message || "Unable to update patient in Firebase.");
    }
  };

  const handleDelete = async (caseNumber) => {
    try {
      await deletePatientRecord(caseNumber);
      setDeletePatient(null);
    } catch (error) {
      setFormError(error.message || "Unable to delete patient from Firebase.");
    }
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

  const filteredPatients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return patients.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        p.caseNumber.toLowerCase().includes(search);
      const matchesType = typeFilter === "all" || p.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [patients, searchTerm, typeFilter]);

  const stats = [
    { label: "Total Patients", value: patients.length, icon: Users, color: "bg-green-100 text-green-700" },
    { label: "Inpatients", value: patients.filter((p) => p.type === "inpatient").length, icon: Bed, color: "bg-emerald-100 text-emerald-700" },
    { label: "Outpatients", value: patients.filter((p) => p.type === "outpatient").length, icon: UserRound, color: "bg-blue-100 text-blue-700" },
  ];

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
  };

  return (
    <DashboardLayout>
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            PATIENT <span className="text-green-600">REGISTRY</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Hospital Records & Management</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <button
            onClick={() => exportPatientsCsv(filteredPatients)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none transition-all"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {stats.map((item) => (
          <div
            key={item.label}
            className="bg-white p-5 rounded-2xl border-2 border-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {item.label}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">{item.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl border-2 border-black ${item.color}`}>
                <item.icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-4 mb-8 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
            <input
              placeholder="Search patient name or case number..."
              className="w-full border-2 border-black bg-white pl-12 pr-4 py-3 rounded-xl focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border-2 border-black rounded-xl px-4 py-3 text-sm font-black outline-none bg-white"
          >
            <option value="all">All Types</option>
            <option value="inpatient">Inpatients</option>
            <option value="outpatient">Outpatients</option>
          </select>

          <button
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-xs font-black uppercase text-slate-500 hover:border-black hover:text-black transition-colors"
          >
            <X size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* LEFT: REGISTRATION FORM WITH BLACK BORDER */}
        <div className="lg:col-span-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-green-100 border-2 border-black text-black rounded-2xl">
                <UserPlus size={24} />
              </div>
              <h2 className="font-black text-xl text-gray-900 uppercase tracking-tight">Register Patient</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Patient Name</label>
                <input
                  className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 focus:bg-white transition-all outline-none text-sm font-bold"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const hasExistingRecord = patients.some(
                      (p) => normalizePatientName(p.name) === normalizePatientName(name),
                    );
                    setForm({ ...form, name, recordType: hasExistingRecord ? "old" : "new" });
                    setFormError("");
                  }}
                  placeholder="Full Name"
                  required
                />
                {formNameMatchesExistingPatient && (
                  <p className="text-[10px] font-black uppercase text-amber-600 px-1">
                    Existing patient name found. This record will be marked old/readmission.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Case ID</label>
                <input
                  className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 focus:bg-white transition-all outline-none font-mono text-sm font-bold"
                  value={form.caseNumber}
                  onChange={(e) => {
                    setForm({ ...form, caseNumber: e.target.value.toUpperCase() });
                    setFormError("");
                  }}
                  placeholder="CN-2026-000"
                  required
                />
              </div>

              {formError && (
                <div className="border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admission</label>
                  <input
                    type="date"
                    className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 outline-none text-xs font-bold"
                    value={form.admissionDate}
                    onChange={(e) => {
                      const admissionDate = e.target.value;
                      setForm({
                        ...form,
                        admissionDate,
                        dischargeDate: form.type === "outpatient" ? admissionDate : form.dischargeDate,
                      });
                      setFormError("");
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Discharge</label>
                  <input
                    type="date"
                    className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 outline-none text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    value={form.dischargeDate}
                    onChange={(e) => {
                      setForm({ ...form, dischargeDate: e.target.value });
                      setFormError("");
                    }}
                    disabled={form.type === "outpatient"}
                    required={form.type === "inpatient"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Care Status</label>
                <select
                  className="w-full border-2 border-black p-3 rounded-xl bg-gray-50 outline-none text-sm font-bold cursor-pointer"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setForm({
                      ...form,
                      type,
                      dischargeDate: type === "outpatient" ? form.admissionDate : "",
                    });
                    setFormError("");
                  }}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                </select>
              </div>

              <button className="w-full bg-green-500 hover:bg-green-600 border-2 border-black text-black py-3 rounded-xl font-black transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 mt-2">
                ADD RECORD <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: TABLE WITH BLACK BORDERS ON ROWS */}
        <div className="lg:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-2">
            <div>
              <h2 className="font-black text-slate-800 uppercase">Registered Patients</h2>
              <p className="text-xs font-bold text-slate-400">
                Showing {filteredPatients.length} of {patients.length} records
              </p>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full table-fixed border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left">
                  <th className="w-[38%] px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                  <th className="w-[27%] px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
                  <th className="w-[18%] px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="w-[17%] px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="bg-white transition-all">
                    <td className="px-3 py-3 rounded-l-xl border-y-2 border-l-2 border-black shadow-[0px_4px_0px_0px_rgba(0,0,0,0.05)]">
                      <div className="font-black text-gray-900 text-base uppercase leading-tight break-words">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <code className="text-xs font-mono text-green-900 font-black tracking-wide">{p.caseNumber}</code>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase ${
                          (p.recordType || "new") === "old"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {(p.recordType || "new") === "old" ? "Old / Readmit" : "New"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-y-2 border-black">
                      <div className="text-[11px] font-black text-700 uppercase">Admission: {p.admissionDate || "--"}</div>
                      <div className="text-[11px] font-black text-700 uppercase">Discharge: {p.dischargeDate || "Active"}</div>
                    </td>
                    <td className="px-3 py-3 border-y-2 border-black">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black ${
                        p.type === 'inpatient' ? 'bg-green-400 text-white' : 'bg-blue-400 text-white'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 rounded-r-xl border-y-2 border-r-2 border-black text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewPatient(p)} className="p-2 border-2 border-transparent hover:border-black hover:bg-gray-50 rounded-xl transition-all">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => { setEditPatient({ ...p, previousCaseNumber: p.caseNumber }); setEditError(""); }} className="p-2 border-2 border-transparent hover:border-black hover:bg-gray-50 rounded-xl transition-all">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => setDeletePatient(p)} className="p-2 border-2 border-transparent hover:border-black hover:bg-red-50 text-red-500 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan="4" className="bg-white rounded-2xl border-2 border-black p-10 text-center">
                      <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-black text-slate-700 uppercase">
                        {isLoading ? "Loading patients..." : "No patients found"}
                      </p>
                      <p className="text-sm text-slate-400 font-semibold mt-1">
                        {isLoading ? "Reading records from Firebase." : "Try changing the search or type filter."}
                      </p>
                    </td>
                  </tr>
                )}
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
                <div className="p-2 bg-green-400 border-2 border-black rounded-xl"><Edit size={24} /></div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Update Record</h2>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Name</label>
                    <input
                      className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none focus:bg-gray-50"
                      value={editPatient.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const hasExistingRecord = patients.some(
                          (p) => p.id !== editPatient.id && normalizePatientName(p.name) === normalizePatientName(name),
                        );
                        setEditPatient({ ...editPatient, name, recordType: hasExistingRecord ? "old" : editPatient.recordType || "new" });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Case Number</label>
                    <input className="w-full border-2 border-black p-4 rounded-xl font-mono font-bold outline-none focus:bg-gray-50" value={editPatient.caseNumber} onChange={(e) => { setEditPatient({ ...editPatient, caseNumber: e.target.value.toUpperCase() }); setEditError(""); }} required />
                  </div>
                  {editError && (
                    <div className="col-span-2 border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                      {editError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Admission</label>
                    <input
                      type="date"
                      className="w-full border-2 border-black p-3 rounded-xl font-bold"
                      value={editPatient.admissionDate}
                      onChange={(e) => {
                        const admissionDate = e.target.value;
                        setEditPatient({
                          ...editPatient,
                          admissionDate,
                          dischargeDate: editPatient.type === "outpatient" ? admissionDate : editPatient.dischargeDate,
                        });
                        setEditError("");
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Discharge</label>
                    <input
                      type="date"
                      className="w-full border-2 border-black p-3 rounded-xl font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      value={editPatient.dischargeDate}
                      onChange={(e) => {
                        setEditPatient({ ...editPatient, dischargeDate: e.target.value });
                        setEditError("");
                      }}
                      disabled={editPatient.type === "outpatient"}
                      required={editPatient.type === "inpatient"}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Record</label>
                    <select
                      className="w-full border-2 border-black p-4 rounded-xl font-bold"
                      value={editPatient.recordType || "new"}
                      onChange={(e) => setEditPatient({ ...editPatient, recordType: e.target.value })}
                    >
                      <option value="new">New Patient</option>
                      <option value="old">Old Patient / Readmission</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Care Status</label>
                    <select
                      className="w-full border-2 border-black p-4 rounded-xl font-bold"
                      value={editPatient.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setEditPatient({
                          ...editPatient,
                          type,
                          dischargeDate: type === "outpatient" ? editPatient.admissionDate : "",
                        });
                        setEditError("");
                      }}
                    >
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setEditPatient(null)} className="flex-1 py-4 font-black text-gray-500 uppercase">Cancel</button>
                  <button type="submit" className="flex-1 bg-green-400 text-black border-2 border-black py-4 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 flex items-center justify-center gap-2">
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
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Record</p>
                    <p className="font-black text-gray-900 uppercase">
                      {(viewPatient.recordType || "new") === "old" ? "Old / Readmission" : "New Patient"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Admission</p>
                    <p className="font-black text-gray-900">{viewPatient.admissionDate || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Discharge</p>
                    <p className="font-black text-gray-900">{viewPatient.dischargeDate || "Ongoing"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Type</p>
                    <p className="font-black text-gray-900 capitalize">{viewPatient.type}</p>
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

      {/* ADD CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPatient(null)} />
            <Motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-white p-7 rounded-2xl border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-green-100 border-2 border-black rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Add Patient Record?</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">Please review before saving</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Patient</p>
                  <p className="font-black text-slate-900 uppercase">{confirmPatient.name}</p>
                  <p className="font-mono text-sm font-black text-green-800">{confirmPatient.caseNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Record</p>
                    <p className="font-black text-slate-800 uppercase">
                      {confirmPatient.recordType === "old" ? "Old / Readmission" : "New Patient"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Type</p>
                    <p className="font-black text-slate-800 uppercase">{confirmPatient.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Admission</p>
                    <p className="font-black text-slate-800">{confirmPatient.admissionDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Discharge</p>
                    <p className="font-black text-slate-800">{confirmPatient.dischargeDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPatient(null)}
                  className="flex-1 py-3 font-black text-gray-500 uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreate}
                  className="flex-1 py-3 bg-green-600 text-white border-2 border-black rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                >
                  Confirm
                </button>
              </div>
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
                <button onClick={() => handleDelete(deletePatient.caseNumber)} className="flex-1 py-4 bg-red-500 text-white border-2 border-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">Yes</button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
