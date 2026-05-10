import Barcode from "react-barcode";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Download, X } from "lucide-react";

export default function PatientViewModal({
  isFirstAdmissionRecord,
  onClose,
  onDownloadBarcode,
  patient,
  patients,
}) {
  return (
    <AnimatePresence>
      {patient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 text-center sm:p-10">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl border-2 border-transparent text-slate-400 transition-colors hover:border-black hover:bg-slate-50 hover:text-black"
              aria-label="Close patient view"
            >
              <X size={18} />
            </button>
            <div className="size-20 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6"><ClipboardList size={38} /></div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter">{patient.name}</h2>
            <p className="text-gray-500 font-mono font-bold text-sm mb-8">{patient.caseNumber}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Record</p>
                <p className="font-black text-gray-900 uppercase">
                  {isFirstAdmissionRecord(patients, patient) ? "First Admission" : "Old / Readmission"}
                </p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                  {patient.type === "inpatient" ? "Admitted Location" : "Outpatient Department"}
                </p>
                <p className="font-black text-gray-900 uppercase">{patient.department || "Unassigned"}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Admission</p>
                <p className="font-black text-gray-900">{patient.admissionDate || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Discharge</p>
                <p className="font-black text-gray-900">{patient.dischargeDate || "Ongoing"}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Type</p>
                <p className="font-black text-gray-900 capitalize">{patient.type}</p>
              </div>
            </div>

            <div className="mrs-card p-6 rounded-2xl mb-8 flex justify-center">
              <Barcode id={`barcode-${patient.caseNumber}`} value={patient.caseNumber} width={1.8} height={60} fontSize={14} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl border-2 border-black bg-white py-4 font-black uppercase text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button onClick={() => onDownloadBarcode(patient.caseNumber)} className="mrs-blue-button w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all">
                <Download size={20} /> Download PNG
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
