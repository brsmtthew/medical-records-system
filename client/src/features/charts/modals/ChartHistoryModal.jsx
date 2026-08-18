import { motion as Motion, AnimatePresence } from "framer-motion";
import { History, X } from "lucide-react";
import { formatDisplayDate } from "@shared/utils/dateFormatting";

const modalCardClass =
  "mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl p-4";

export default function ChartHistoryModal({ chart, onClose }) {
  const visibleLogs = (chart?.history || []).filter((log) => log.borrower !== "System");

  return (
    <AnimatePresence>
      {chart && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
          <Motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`${modalCardClass} max-w-md sm:p-8`}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="pr-9 text-xl sm:text-2xl font-black uppercase italic text-slate-800 mb-1">Circulation History</h2>
            <p className="text-xs font-bold text-slate-400 uppercase mb-6">
              {chart.patientName} - {chart.caseNumber}
            </p>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {visibleLogs.length === 0 && (
                <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-center">
                  <History size={34} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-black text-slate-700 uppercase">No history of borrowing or returned</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    This chart has not been borrowed or returned yet.
                  </p>
                </div>
              )}
              {visibleLogs.map((log, index) => (
                <div key={`${log.action}-${log.date}-${index}`} className="relative pl-6 border-l-2 border-slate-200 pb-2 last:pb-0">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ring-2 ring-slate-300 ${log.action === "checkout" ? "bg-blue-500" : "bg-green-500"}`} />
                  <p className="text-sm font-black uppercase text-slate-800">{log.action === "checkout" ? "Borrowed" : "Returned"}</p>
                  <p className="text-xs font-bold text-slate-700">Borrowed By: {log.borrower || "N/A"}</p>
                  {log.action === "checkin" && (
                    <p className="text-xs font-bold text-slate-700">
                      Returned By: {log.returnedBy || log.borrower || "N/A"}
                    </p>
                  )}
                  <p className="text-xs font-bold text-slate-700">Department: {log.department || "N/A"}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    {formatDisplayDate(log.date)}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="mrs-primary-button w-full mt-8 rounded-xl py-3 font-black uppercase text-xs transition">Close Log</button>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
