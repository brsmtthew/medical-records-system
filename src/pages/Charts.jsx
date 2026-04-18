import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { 
  ScanLine, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  X, 
  Clock, 
  ChevronRight 
} from "lucide-react";

export default function Charts() {
  const [charts, setCharts] = useState([
    {
      caseNumber: "CN-2026-001",
      patientName: "Juan Dela Cruz",
      status: "available",
      borrower: "",
      history: [
        { action: "checkin", date: "4/15/2026, 10:30 AM", borrower: "System" }
      ],
    },
    {
      caseNumber: "CN-2026-002",
      patientName: "Maria Santos",
      status: "borrowed",
      borrower: "Dr. Smith",
      history: [
        { action: "checkout", date: "4/18/2026, 09:15 AM", borrower: "Dr. Smith" }
      ],
    },
  ]);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [borrower, setBorrower] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const handleCheckout = () => {
    if (!barcodeInput.trim() || !borrower.trim()) return;
    let found = false;
    const updated = charts.map((chart) => {
      if (chart.caseNumber === barcodeInput.trim()) {
        found = true;
        if (chart.status === "borrowed") return chart;
        return {
          ...chart,
          status: "borrowed",
          borrower: borrower.trim(),
          history: [
            { action: "checkout", borrower: borrower.trim(), date: new Date().toLocaleString() },
            ...chart.history,
          ],
        };
      }
      return chart;
    });
    if (found) setCharts(updated);
    setBarcodeInput("");
    setBorrower("");
  };

  const handleCheckin = () => {
    if (!barcodeInput.trim()) return;
    let found = false;
    const updated = charts.map((chart) => {
      if (chart.caseNumber === barcodeInput.trim()) {
        found = true;
        if (chart.status === "available") return chart;
        return {
          ...chart,
          status: "available",
          borrower: "",
          history: [
            { action: "checkin", date: new Date().toLocaleString(), borrower: "N/A" },
            ...chart.history,
          ],
        };
      }
      return chart;
    });
    if (found) setCharts(updated);
    setBarcodeInput("");
  };

  return (
    <DashboardLayout>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
          Chart <span className="text-green-700">Tracking</span>
        </h1>
        <p className="text-slate-500 font-medium">Physical record circulation management</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* SCANNING STATION */}
        <div className="lg:col-span-1">
          <Motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sticky top-24"
          >
            <div className="flex items-center gap-2 mb-6 text-green-700">
              <ScanLine size={24} strokeWidth={3} />
              <h2 className="font-black text-xl uppercase italic">Scan Station</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Barcode / Case No.</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="CN-2026-XXX"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold placeholder:text-slate-300"
                  />
                  <ScanLine className="absolute right-3 top-3 text-slate-300" size={20} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Borrower Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Dr. Richards"
                    value={borrower}
                    onChange={(e) => setBorrower(e.target.value)}
                    className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold placeholder:text-slate-300"
                  />
                  <User className="absolute right-3 top-3 text-slate-300" size={20} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={handleCheckout}
                  className="bg-red-500 text-white py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#991b1b] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUpRight size={16} strokeWidth={3}/> Out
                </button>
                <button
                  onClick={handleCheckin}
                  className="bg-green-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#14532d] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowDownLeft size={16} strokeWidth={3}/> In
                </button>
              </div>
            </div>
          </Motion.div>
        </div>

        {/* STATUS TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-black">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Chart Info</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Current Status</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts.map((chart) => (
                  <tr key={chart.caseNumber} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-800 uppercase leading-none mb-1">{chart.patientName}</div>
                      <div className="text-[10px] font-bold text-slate-400">{chart.caseNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                          chart.status === "available" 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {chart.status}
                        </span>
                        {chart.borrower && (
                          <span className="text-xs font-bold text-slate-600 italic">held by {chart.borrower}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedHistory(chart)}
                        className="p-2 border-2 border-transparent hover:border-black rounded-xl transition-all inline-flex items-center gap-2 text-slate-400 hover:text-black font-bold text-xs"
                      >
                        <History size={18} /> View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {selectedHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black rounded-[40px] p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-green-600" />
              <button 
                onClick={() => setSelectedHistory(null)} 
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-black uppercase italic text-slate-800">Circulation History</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedHistory.patientName}</p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedHistory.history.map((log, i) => (
                  <div key={i} className="relative pl-6 border-l-2 border-slate-200 pb-2 last:pb-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_2px_black] ${
                      log.action === 'checkout' ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-800">
                          {log.action === 'checkout' ? 'Borrowed' : 'Returned'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1 uppercase">
                          <Clock size={10} /> {log.date}
                        </p>
                      </div>
                      {log.action === 'checkout' && (
                        <div className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {log.borrower}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSelectedHistory(null)}
                className="w-full mt-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                Close Log
              </button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}