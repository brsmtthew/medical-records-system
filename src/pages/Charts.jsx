import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  History,
  RotateCcw,
  ScanLine,
  Search,
  X,
} from "lucide-react";

const today = new Date("2026-04-30T00:00:00");

function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

function daysBorrowed(date) {
  if (!date) return 0;
  const borrowedDate = new Date(date);
  const borrowedDay = new Date(borrowedDate.getFullYear(), borrowedDate.getMonth(), borrowedDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(
    0,
    Math.floor((todayDay.getTime() - borrowedDay.getTime()) / 86400000)
  );
}

export default function Charts() {
  const [charts, setCharts] = useState([
    {
      caseNumber: "CN-2026-001",
      patientName: "Juan Dela Cruz",
      status: "available",
      borrower: "",
      department: "",
      borrowedAt: "",
      dueDate: "",
      history: [
        { action: "checkin", date: "2026-04-15T10:30:00", borrower: "System", department: "Medical Records" },
      ],
    },
    {
      caseNumber: "CN-2026-002",
      patientName: "Maria Santos",
      status: "borrowed",
      borrower: "Dr. Smith",
      department: "Internal Medicine",
      borrowedAt: "2026-04-28T09:15:00",
      dueDate: "2026-05-01",
      history: [
        { action: "checkout", date: "2026-04-28T09:15:00", borrower: "Dr. Smith", department: "Internal Medicine" },
      ],
    },
    {
      caseNumber: "CN-2026-003",
      patientName: "Ana Lim",
      status: "borrowed",
      borrower: "Dr. Santos",
      department: "Surgery",
      borrowedAt: "2026-04-20T08:45:00",
      dueDate: "2026-04-23",
      history: [
        { action: "checkout", date: "2026-04-20T08:45:00", borrower: "Dr. Santos", department: "Surgery" },
      ],
    },
  ]);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [borrower, setBorrower] = useState("");
  const [department, setDepartment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [notice, setNotice] = useState(null);

  const stats = useMemo(() => {
    const borrowed = charts.filter((chart) => chart.status === "borrowed");
    const overdue = borrowed.filter((chart) => chart.dueDate && new Date(chart.dueDate) < today);

    return [
      { label: "Total Charts", value: charts.length, icon: Archive, color: "bg-green-100 text-green-700" },
      { label: "Available", value: charts.filter((chart) => chart.status === "available").length, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
      { label: "Borrowed", value: borrowed.length, icon: Clock, color: "bg-blue-100 text-blue-700" },
      { label: "Overdue", value: overdue.length, icon: AlertTriangle, color: "bg-red-100 text-red-700" },
    ];
  }, [charts]);

  const filteredCharts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return charts.filter((chart) => {
      const isOverdue = chart.status === "borrowed" && chart.dueDate && new Date(chart.dueDate) < today;
      const matchesStatus =
        statusFilter === "all" ||
        chart.status === statusFilter ||
        (statusFilter === "overdue" && isOverdue);
      const matchesSearch =
        !query ||
        chart.patientName.toLowerCase().includes(query) ||
        chart.caseNumber.toLowerCase().includes(query) ||
        chart.borrower.toLowerCase().includes(query) ||
        chart.department.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [charts, searchQuery, statusFilter]);

  const setTransactionNotice = (type, message) => {
    setNotice({ type, message });
  };

  const handleCheckout = () => {
    const caseNumber = normalizeCaseNumber(barcodeInput);
    if (!caseNumber || !borrower.trim()) {
      setTransactionNotice("error", "Enter a case number and borrower before checking out.");
      return;
    }

    let found = false;
    let blocked = false;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 3);

    const updated = charts.map((chart) => {
      if (chart.caseNumber !== caseNumber) return chart;
      found = true;
      if (chart.status === "borrowed") {
        blocked = true;
        return chart;
      }

      return {
        ...chart,
        status: "borrowed",
        borrower: borrower.trim(),
        department: department.trim() || "Unassigned",
        borrowedAt: now.toISOString(),
        dueDate: dueDate.toISOString().slice(0, 10),
        history: [
          {
            action: "checkout",
            borrower: borrower.trim(),
            department: department.trim() || "Unassigned",
            date: now.toISOString(),
          },
          ...chart.history,
        ],
      };
    });

    if (!found) {
      setTransactionNotice("error", "No chart found for that case number.");
      return;
    }
    if (blocked) {
      setTransactionNotice("error", "This chart is already borrowed.");
      return;
    }

    setCharts(updated);
    setBarcodeInput("");
    setBorrower("");
    setDepartment("");
    setTransactionNotice("success", `${caseNumber} checked out successfully.`);
  };

  const handleCheckin = () => {
    const caseNumber = normalizeCaseNumber(barcodeInput);
    if (!caseNumber) {
      setTransactionNotice("error", "Enter a case number before checking in.");
      return;
    }

    let found = false;
    let blocked = false;
    const now = new Date();
    const updated = charts.map((chart) => {
      if (chart.caseNumber !== caseNumber) return chart;
      found = true;
      if (chart.status === "available") {
        blocked = true;
        return chart;
      }

      return {
        ...chart,
        status: "available",
        borrower: "",
        department: "",
        borrowedAt: "",
        dueDate: "",
        history: [
          {
            action: "checkin",
            date: now.toISOString(),
            borrower: chart.borrower || "N/A",
            department: chart.department || "N/A",
          },
          ...chart.history,
        ],
      };
    });

    if (!found) {
      setTransactionNotice("error", "No chart found for that case number.");
      return;
    }
    if (blocked) {
      setTransactionNotice("error", "This chart is already available.");
      return;
    }

    setCharts(updated);
    setBarcodeInput("");
    setTransactionNotice("success", `${caseNumber} checked in successfully.`);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            Chart <span className="text-green-700">Tracking</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Physical record circulation, borrower accountability, and overdue monitoring.
          </p>
        </div>

        <div className="relative group w-full xl:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400 group-focus-within:text-black transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search patient, case, borrower, department"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-black py-2.5 pl-10 pr-4 rounded-xl font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((item) => (
          <div key={item.label} className="bg-white p-5 rounded-2xl border-2 border-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{item.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl border-2 border-black ${item.color}`}>
                <item.icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
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

            {notice && (
              <div
                className={`mb-4 border-2 rounded-xl px-4 py-3 text-xs font-black ${
                  notice.type === "success"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {notice.message}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Barcode / Case No.</label>
                <input
                  type="text"
                  placeholder="CN-2026-XXX"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Borrower Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Richards"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Room"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={handleCheckout}
                  className="bg-red-500 text-white py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#991b1b] active:shadow-none active:translate-y-1 transition-all inline-flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Check-Out
                </button>
                <button
                  onClick={handleCheckin}
                  className="bg-green-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#14532d] active:shadow-none active:translate-y-1 transition-all inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  Check-In
                </button>
              </div>
            </div>
          </Motion.div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            {["all", "available", "borrowed", "overdue"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase border-2 transition-colors ${
                  statusFilter === filter
                    ? "bg-black text-white border-black"
                    : "bg-white text-slate-500 border-slate-200 hover:border-black"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-black">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Chart Info</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Borrower</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400">Current Status</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {filteredCharts.map((chart) => {
                    const isOverdue = chart.status === "borrowed" && chart.dueDate && new Date(chart.dueDate) < today;

                    return (
                      <Motion.tr
                        key={chart.caseNumber}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="font-black text-slate-800 uppercase leading-none mb-1">{chart.patientName}</div>
                          <div className="text-[10px] font-bold text-slate-400">{chart.caseNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-black text-slate-700">{chart.borrower || "Records Room"}</div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">{chart.department || "Available"}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                              chart.status === "available"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : isOverdue
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {isOverdue ? "overdue" : chart.status}
                            </span>
                            {chart.status === "borrowed" && (
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                {daysBorrowed(chart.borrowedAt)} day(s) borrowed • due {chart.dueDate}
                              </span>
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
                      </Motion.tr>
                    );
                  })}
                </AnimatePresence>

                {filteredCharts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center">
                      <Archive size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-black text-slate-700 uppercase">No charts found</p>
                      <p className="text-sm text-slate-400 font-semibold mt-1">
                        Try changing the search or status filter.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black rounded-[40px] p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative"
            >
              <button
                onClick={() => setSelectedHistory(null)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-black uppercase italic text-slate-800 mb-1">Circulation History</h2>
              <p className="text-xs font-bold text-slate-400 uppercase mb-6">
                {selectedHistory.patientName} • {selectedHistory.caseNumber}
              </p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {selectedHistory.history.map((log, i) => (
                  <div key={`${log.action}-${log.date}-${i}`} className="relative pl-6 border-l-2 border-slate-200 pb-2 last:pb-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_2px_black] ${log.action === "checkout" ? "bg-red-500" : "bg-green-500"}`} />
                    <p className="text-sm font-black uppercase text-slate-800">{log.action === "checkout" ? "Borrowed" : "Returned"}</p>
                    <p className="text-xs font-bold text-slate-700">
                      {log.action === "checkout" ? "Borrowed By" : "Returned By"}: {log.borrower || "N/A"}
                    </p>
                    <p className="text-xs font-bold text-slate-700">Department: {log.department || "N/A"}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      {new Date(log.date).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelectedHistory(null)} className="w-full mt-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-xs">Close Log</button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
