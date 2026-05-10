import { motion as Motion, AnimatePresence } from "framer-motion";
import { Edit, Save } from "lucide-react";

export default function PatientEditModal({
  editDepartmentLabel,
  editDepartmentOptions,
  isFirstAdmissionRecord,
  onClose,
  onSubmit,
  patient,
  patients,
  pendingAction,
  setEditError,
  setPatient,
  normalizePatientName,
}) {
  return (
    <AnimatePresence>
      {patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl"><Edit size={24} /></div>
              <h2 className="text-2xl font-black text-gray-900 uppercase">Update Record</h2>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Name</label>
                  <input
                    className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none focus:bg-gray-50"
                    value={patient.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      const hasExistingRecord = patients.some(
                        (item) => item.id !== patient.id && normalizePatientName(item.name) === normalizePatientName(name),
                      );
                      setPatient({ ...patient, name, recordType: hasExistingRecord ? "old" : patient.recordType || "new" });
                    }}
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Case Number</label>
                  <input
                    className="w-full border-2 border-black p-4 rounded-xl font-mono font-bold outline-none focus:bg-gray-50"
                    value={patient.caseNumber}
                    onChange={(event) => {
                      setPatient({ ...patient, caseNumber: event.target.value.toUpperCase() });
                      setEditError("");
                    }}
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">{editDepartmentLabel}</label>
                  <select
                    className="w-full border-2 border-black p-4 rounded-xl font-bold bg-white"
                    value={patient.department || ""}
                    onChange={(event) => {
                      setPatient({ ...patient, department: event.target.value });
                      setEditError("");
                    }}
                    required
                  >
                    <option value="">Select {editDepartmentLabel.toLowerCase()}</option>
                    {editDepartmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Admission</label>
                  <input
                    type="date"
                    className="w-full border-2 border-black p-3 rounded-xl font-bold"
                    value={patient.admissionDate}
                    onChange={(event) => {
                      const admissionDate = event.target.value;
                      setPatient({
                        ...patient,
                        admissionDate,
                        dischargeDate: patient.type === "outpatient" ? admissionDate : patient.dischargeDate,
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
                    value={patient.dischargeDate}
                    onChange={(event) => {
                      setPatient({ ...patient, dischargeDate: event.target.value });
                      setEditError("");
                    }}
                    disabled={patient.type === "outpatient"}
                    required={patient.type === "inpatient"}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Record</label>
                  <div className="w-full border-2 border-black p-4 rounded-xl font-bold bg-slate-50 text-slate-700">
                    {isFirstAdmissionRecord(patients, patient) ? "First Admission" : "Old Patient / Readmission"}
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Care Status</label>
                  <select
                    className="w-full border-2 border-black p-4 rounded-xl font-bold"
                    value={patient.type}
                    onChange={(event) => {
                      const type = event.target.value;
                      setPatient({
                        ...patient,
                        type,
                        department: "",
                        dischargeDate: type === "outpatient" ? patient.admissionDate : "",
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
                <button type="button" onClick={onClose} className="flex-1 py-4 font-black text-gray-500 uppercase">Cancel</button>
                <button type="submit" disabled={pendingAction === "update"} className="mrs-blue-button flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
                  <Save size={20} /> {pendingAction === "update" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
