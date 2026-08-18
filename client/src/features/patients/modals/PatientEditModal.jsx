import { motion as Motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Edit, Hash, LoaderCircle, MapPin, Save, UserRound, X } from "lucide-react";
import StatusBadge from "@shared/components/StatusBadge";
import DoctorSelect from "@shared/components/DoctorSelect";
import { buildAttendingDoctorFields, findDoctorById } from "@shared/utils/doctors";

const fieldClass =
  "mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold";

function Field({ children, className = "", label }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ReadOnlyCard({ label, value, tone = "text-slate-700" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black uppercase leading-tight ${tone}`}>{value}</p>
    </div>
  );
}

export default function PatientEditModal({
  editDepartmentLabel,
  editDepartmentOptions,
  doctors,
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
  const recordLabel = patient && isFirstAdmissionRecord(patients, patient)
    ? "First Admission"
    : "Old Patient / Readmission";

  return (
    <AnimatePresence>
      {patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-400 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800"
              aria-label="Close edit patient"
            >
              <X size={18} />
            </button>

            <div className="border-b border-slate-100 bg-slate-50 p-5 pr-16">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Edit size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black uppercase text-slate-900">Update Patient Record</p>
                  <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                    Edit patient identity, location, and admission dates. Linked records will follow the updated patient fields.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusBadge tone={patient.type === "inpatient" ? "inpatient" : "outpatient"}>{patient.type}</StatusBadge>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                  recordLabel === "First Admission"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                  {recordLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field className="sm:col-span-2" label="Patient Name">
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${fieldClass} pl-9 uppercase`}
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
                </Field>

                <Field className="sm:col-span-2" label="Case Number">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${fieldClass} pl-9 font-mono uppercase`}
                      value={patient.caseNumber}
                      onChange={(event) => {
                        setPatient({ ...patient, caseNumber: event.target.value.toUpperCase() });
                        setEditError("");
                      }}
                      required
                    />
                  </div>
                </Field>

                <Field className="sm:col-span-2" label={editDepartmentLabel}>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <select
                      className={`${fieldClass} pl-9`}
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
                </Field>

                <Field className="sm:col-span-2" label="Attending Physician">
                  <DoctorSelect
                    doctors={doctors}
                    label="Attending Physician"
                    value={patient.attendingDoctorId || ""}
                    onChange={(doctorId) => {
                      setPatient({
                        ...patient,
                        ...buildAttendingDoctorFields(findDoctorById(doctors, doctorId)),
                      });
                      setEditError("");
                    }}
                  />
                </Field>

                <Field label="Admission Date">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className={`${fieldClass} pl-9`}
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
                </Field>

                <Field label="Discharge Date">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className={`${fieldClass} pl-9 disabled:bg-slate-100 disabled:text-slate-400`}
                      value={patient.dischargeDate}
                      onChange={(event) => {
                        setPatient({ ...patient, dischargeDate: event.target.value });
                        setEditError("");
                      }}
                      disabled={patient.type === "outpatient"}
                      required={patient.type === "inpatient"}
                    />
                  </div>
                </Field>

                <Field className="sm:col-span-2" label="Care Type">
                  <select
                    className={fieldClass}
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
                </Field>

                <ReadOnlyCard
                  label="Patient Record"
                  tone={recordLabel === "First Admission" ? "text-green-700" : "text-amber-700"}
                  value={recordLabel}
                />
                <ReadOnlyCard
                  label="Linked Case"
                  tone="text-blue-700"
                  value={patient.previousCaseNumber || patient.caseNumber}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
                  Cancel
                </button>
                <button type="submit" disabled={pendingAction === "update"} className="mrs-blue-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-70">
                  {pendingAction === "update" ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
                  {pendingAction === "update" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
