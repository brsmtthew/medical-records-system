import { motion as Motion } from "framer-motion";
import { ArrowRight, UserPlus, X } from "lucide-react";
import DoctorSelect from "@shared/components/DoctorSelect";
import { buildAttendingDoctorFields, findDoctorById } from "@shared/utils/doctors";

export default function PatientRegistrationModal({
  form,
  formNameMatchesExistingPatient,
  isOpen,
  normalizePatientName,
  onClose,
  onSubmit,
  doctors,
  patientDepartmentLabel,
  patientDepartmentOptions,
  patients,
  setForm,
  setFormError,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <Motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Motion.div
        initial={{ scale: 0.97, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-hidden rounded-2xl p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
            <UserPlus size={20} />
          </div>
          <h2 className="font-black text-lg text-gray-900 uppercase tracking-tight">Register Patient</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-black"
            aria-label="Close add patient"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid max-h-[calc(100dvh-8rem)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Patient Name</label>
            <input
              className="mrs-field w-full p-3 rounded-xl text-sm font-bold"
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                const hasExistingRecord = patients.some(
                  (patient) => normalizePatientName(patient.name) === normalizePatientName(name),
                );
                setForm({ ...form, name, recordType: hasExistingRecord ? "old" : "new" });
                setFormError("");
              }}
              placeholder="Full Name"
              required
            />
            {formNameMatchesExistingPatient && (
              <p className="text-[10px] font-black uppercase text-amber-600 px-1">
                Existing patient name found.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Case ID</label>
            <input
              className="mrs-field w-full p-3 rounded-xl font-mono text-sm font-bold"
              value={form.caseNumber}
              onChange={(event) => {
                setForm({ ...form, caseNumber: event.target.value.toUpperCase() });
                setFormError("");
              }}
              placeholder="Enter case number from patient system"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Care Status</label>
            <select
              className="mrs-field w-full p-3 rounded-xl text-sm font-bold cursor-pointer"
              value={form.type}
              onChange={(event) => {
                const type = event.target.value;
                setForm({
                  ...form,
                  type,
                  department: "",
                  dischargeDate: type === "outpatient" ? form.admissionDate : "",
                });
                setFormError("");
              }}
            >
              <option value="outpatient">Outpatient</option>
              <option value="inpatient">Inpatient</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              {patientDepartmentLabel}
            </label>
            <select
              className="mrs-field w-full p-3 rounded-xl text-sm font-bold cursor-pointer"
              value={form.department}
              onChange={(event) => {
                setForm({ ...form, department: event.target.value });
                setFormError("");
              }}
              required
            >
              <option value="">Select {patientDepartmentLabel.toLowerCase()}</option>
              {patientDepartmentOptions.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Attending Physician
            </label>
            <DoctorSelect
              doctors={doctors}
              label="Attending Physician"
              value={form.attendingDoctorId}
              onChange={(doctorId) => {
                setForm({
                  ...form,
                  ...buildAttendingDoctorFields(findDoctorById(doctors, doctorId)),
                });
                setFormError("");
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admission</label>
              <input
                type="date"
                className="mrs-field w-full p-3 rounded-xl text-xs font-bold"
                value={form.admissionDate}
                onChange={(event) => {
                  const admissionDate = event.target.value;
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
                className="mrs-field w-full p-3 rounded-xl text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                value={form.dischargeDate}
                onChange={(event) => {
                  setForm({ ...form, dischargeDate: event.target.value });
                  setFormError("");
                }}
                disabled={form.type === "outpatient"}
                required={form.type === "inpatient"}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase"
            >
              Add Record <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </Motion.div>
    </div>
  );
}
