import { motion as Motion, AnimatePresence } from "framer-motion";
import { FileText, RotateCcw } from "lucide-react";

const modalCardClass =
  "mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl p-4";

export default function ChartTransactionConfirmModal({
  isSaving,
  onCancel,
  onConfirmBorrow,
  onConfirmReturn,
  transaction,
}) {
  return (
    <AnimatePresence>
      {transaction && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onCancel}
          />
          <Motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className={`${modalCardClass} max-w-md sm:p-7`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-3 rounded-2xl ${
                transaction.type === "borrow"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-green-50 text-green-700"
              }`}>
                {transaction.type === "borrow" ? <FileText size={24} /> : <RotateCcw size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  Confirm {transaction.type === "borrow" ? "Borrow" : "Return"} Chart
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Review transaction details before saving
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Chart</p>
                <p className="font-black text-slate-900 uppercase">{transaction.chart.patientName}</p>
                <p className="font-mono text-sm font-black text-green-800">{transaction.caseNumber}</p>
              </div>

              {transaction.type === "borrow" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Borrower</p>
                    <p className="font-black text-slate-800">{transaction.borrower}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Department</p>
                    <p className="font-black text-slate-800">{transaction.department}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Borrowed By</p>
                    <p className="font-black text-slate-800">{transaction.chart.borrower || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Returned By</p>
                    <p className="font-black text-slate-800">{transaction.returner}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Department</p>
                    <p className="font-black text-slate-800">{transaction.chart.department || "N/A"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 py-3 font-black text-slate-500 uppercase"
              >
                Cancel
              </button>
              <button
                onClick={transaction.type === "borrow" ? onConfirmBorrow : onConfirmReturn}
                disabled={isSaving}
                className={`flex-1 rounded-xl py-3 font-black uppercase text-white shadow-lg transition ${
                  transaction.type === "borrow" ? "mrs-blue-button" : "bg-green-600"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {isSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
