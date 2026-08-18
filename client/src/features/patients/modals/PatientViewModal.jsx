import Barcode from "react-barcode";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ClipboardList, Download, MapPin, Stethoscope, X } from "lucide-react";
import StatusBadge from "@shared/components/StatusBadge";
import { formatDateInputLabel } from "@shared/utils/dateFormatting";

function DetailCard({ icon, label, value, accent = "text-slate-700" }) {
  const DetailIcon = icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
          <DetailIcon size={15} />
        </span>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className={`break-words text-sm font-black uppercase leading-tight ${accent}`}>{value || "N/A"}</p>
    </div>
  );
}

export default function PatientViewModal({
  isFirstAdmissionRecord,
  onClose,
  onDownloadBarcode,
  patient,
  patients,
}) {
  const recordType = patient && isFirstAdmissionRecord(patients, patient) ? "First Admission" : "Old / Readmission";
  const patientType = patient?.type === "inpatient" ? "inpatient" : "outpatient";

  return (
    <AnimatePresence>
      {patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-400 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800"
              aria-label="Close patient view"
            >
              <X size={18} />
            </button>

            <div className="border-b border-slate-100 bg-slate-50 p-5 pr-16 sm:p-6 sm:pr-16">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ClipboardList size={28} />
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={patientType}>{patientType}</StatusBadge>
                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-black uppercase text-green-700">
                      {recordType}
                    </span>
                  </div>
                  <h2 className="break-words text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">{patient.name}</h2>
                  <p className="mt-1 font-mono text-sm font-black uppercase text-green-800">{patient.caseNumber}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  icon={MapPin}
                  label={patient.type === "inpatient" ? "Admitted Location" : "Outpatient Department"}
                  value={patient.department || "Unassigned"}
                  accent="text-blue-700"
                />
                <DetailCard
                  icon={Stethoscope}
                  label="Attending Physician"
                  value={patient.attendingDoctorName || "Unassigned"}
                  accent="text-violet-700"
                />
                <DetailCard
                  icon={CalendarDays}
                  label="Admission Date"
                  value={formatDateInputLabel(patient.admissionDate)}
                  accent="text-amber-700"
                />
                <DetailCard
                  icon={CalendarDays}
                  label="Discharge Date"
                  value={patient.dischargeDate ? formatDateInputLabel(patient.dischargeDate) : "Ongoing"}
                  accent={patient.dischargeDate ? "text-green-700" : "text-blue-700"}
                />
                <DetailCard
                  icon={ClipboardList}
                  label="Record Type"
                  value={recordType}
                  accent={recordType === "First Admission" ? "text-green-700" : "text-amber-700"}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Barcode</p>
                <div className="flex justify-center rounded-lg bg-white p-3">
                  <Barcode id={`barcode-${patient.caseNumber}`} value={patient.caseNumber} width={1.8} height={60} fontSize={14} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="mrs-soft-button flex w-full items-center justify-center rounded-xl px-4 py-3 font-black uppercase"
                >
                  Close
                </button>
                <button onClick={() => onDownloadBarcode(patient.caseNumber)} className="mrs-blue-button flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 font-black uppercase transition-all">
                  <Download size={18} /> Download PNG
                </button>
              </div>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
