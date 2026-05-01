import React, { useEffect, useMemo, useState } from "react";
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
import {
  addChartLog,
  fallbackDepartments,
  subscribeToCharts,
  subscribeToDepartments,
  updateChart,
  updateChartLog,
} from "../services/firebaseRecords";

const today = new Date();

function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

function normalizePatientName(value = "") {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function chartCreatedValue(chart) {
  if (chart.createdAt?.toMillis) return chart.createdAt.toMillis();
  if (chart.createdAt?.seconds) return chart.createdAt.seconds * 1000;
  if (chart.borrowedAt) return new Date(chart.borrowedAt).getTime();
  return Number.MAX_SAFE_INTEGER;
}

function determineChartRecordType(chart, charts) {
  if (chart.recordType === "old") return "old";
  if (chart.recordType === "new") return "new";

  const patientName = normalizePatientName(chart.patientName);
  const relatedCharts = charts
    .filter((item) => normalizePatientName(item.patientName) === patientName)
    .sort((a, b) => {
      const createdDifference = chartCreatedValue(a) - chartCreatedValue(b);
      if (createdDifference !== 0) return createdDifference;
      return a.caseNumber.localeCompare(b.caseNumber);
    });

  return relatedCharts.findIndex((item) => item.caseNumber === chart.caseNumber) > 0 ? "old" : "new";
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
  const [charts, setCharts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [borrowCaseNumber, setBorrowCaseNumber] = useState("");
  const [returnCaseNumber, setReturnCaseNumber] = useState("");
  const [borrower, setBorrower] = useState("");
  const [department, setDepartment] = useState("");
  const [returner, setReturner] = useState("");
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [confirmTransaction, setConfirmTransaction] = useState(null);
  const [notice, setNotice] = useState(null);

  const setTransactionNotice = (type, message) => {
    setNotice({ type, message });
  };

  useEffect(() => {
    const unsubscribeCharts = subscribeToCharts(
      (rows) => {
        setCharts(rows);
        setIsLoading(false);
      },
      (error) => {
        setTransactionNotice("error", error.message || "Unable to load charts from Firebase.");
        setIsLoading(false);
      },
    );

    const unsubscribeDepartments = subscribeToDepartments(
      setDepartments,
      (error) => setTransactionNotice("error", error.message || "Unable to load departments from Firebase."),
    );

    return () => {
      unsubscribeCharts();
      unsubscribeDepartments();
    };
  }, []);

  const departmentOptions = departments.length > 0
    ? departments.map((item) => item.name)
    : fallbackDepartments;

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

  const prepareCheckout = () => {
    const caseNumber = normalizeCaseNumber(borrowCaseNumber);
    if (!caseNumber || !borrower.trim() || !department) {
      setTransactionNotice("error", "Enter a case number, borrower, and department before checking out.");
      return;
    }

    const chart = charts.find((item) => item.caseNumber === caseNumber);

    if (!chart) {
      setTransactionNotice("error", "No chart found for that case number.");
      return;
    }
    if (chart.status === "borrowed") {
      setTransactionNotice("error", "This chart is already borrowed.");
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    setConfirmTransaction({
      type: "borrow",
      chart,
      caseNumber,
      borrower: borrower.trim(),
      department,
      dueDate: dueDate.toISOString().slice(0, 10),
    });
  };

  const handleCheckout = async () => {
    if (!confirmTransaction || confirmTransaction.type !== "borrow") return;
    const { chart, caseNumber } = confirmTransaction;
    const now = new Date();
    const log = {
      action: "borrowed",
      patientName: chart.patientName,
      caseNumber,
      borrowedBy: confirmTransaction.borrower,
      returnedBy: "",
      department: confirmTransaction.department,
      timestamp: now.toISOString(),
      borrowedAt: now.toISOString(),
      returnedAt: "",
      dueDate: confirmTransaction.dueDate,
      remarks: "Chart checked out",
    };

    try {
      const activeLogId = await addChartLog(log);
      await updateChart(caseNumber, {
        status: "borrowed",
        borrower: confirmTransaction.borrower,
        department: confirmTransaction.department,
        borrowedAt: now.toISOString(),
        dueDate: confirmTransaction.dueDate,
        activeLogId,
        history: [
          {
            action: "checkout",
            borrower: confirmTransaction.borrower,
            returnedBy: "",
            department: confirmTransaction.department,
            date: now.toISOString(),
          },
          ...(chart.history || []),
        ],
      });
      setBorrowCaseNumber("");
      setBorrower("");
      setDepartment("");
      setConfirmTransaction(null);
      setTransactionNotice("success", `${caseNumber} checked out successfully.`);
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    }
  };

  const prepareCheckin = () => {
    const caseNumber = normalizeCaseNumber(returnCaseNumber);
    if (!caseNumber || !returner.trim()) {
      setTransactionNotice("error", "Enter a case number and returner before checking in.");
      return;
    }

    const chart = charts.find((item) => item.caseNumber === caseNumber);

    if (!chart) {
      setTransactionNotice("error", "No chart found for that case number.");
      return;
    }
    if (chart.status === "available") {
      setTransactionNotice("error", "This chart is already available.");
      return;
    }

    setConfirmTransaction({
      type: "return",
      chart,
      caseNumber,
      returner: returner.trim(),
    });
  };

  const handleCheckin = async () => {
    if (!confirmTransaction || confirmTransaction.type !== "return") return;
    const { chart, caseNumber } = confirmTransaction;
    const now = new Date();
    try {
      if (chart.activeLogId) {
        await updateChartLog(chart.activeLogId, {
          action: "returned",
          returnedBy: confirmTransaction.returner,
          returnedAt: now.toISOString(),
          dueDate: chart.dueDate || "",
          remarks: "Chart returned",
        });
      } else {
        await addChartLog({
          action: "returned",
          patientName: chart.patientName,
          caseNumber,
          borrowedBy: chart.borrower || "N/A",
          returnedBy: confirmTransaction.returner,
          department: chart.department || "N/A",
          timestamp: chart.borrowedAt || now.toISOString(),
          borrowedAt: chart.borrowedAt || now.toISOString(),
          returnedAt: now.toISOString(),
          dueDate: chart.dueDate || "",
          remarks: "Chart returned",
        });
      }

      await updateChart(caseNumber, {
        status: "available",
        borrower: "",
        department: "",
        borrowedAt: "",
        dueDate: "",
        activeLogId: "",
        history: [
          {
            action: "checkin",
            date: now.toISOString(),
            borrower: chart.borrower || "N/A",
            returnedBy: confirmTransaction.returner,
            department: chart.department || "N/A",
          },
          ...(chart.history || []),
        ],
      });
      setReturnCaseNumber("");
      setReturner("");
      setConfirmTransaction(null);
      setTransactionNotice("success", `${caseNumber} checked in successfully.`);
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
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
                <p className="text-2xl font-black text-slate-800 mt-1">{item.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl border-2 border-black ${item.color}`}>
                <item.icon size={21} />
              </div>
            </div>
          </div>
        ))}
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

      <div className="grid xl:grid-cols-2 gap-5 mb-5">
        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border-2 border-red-100">
                <FileText size={21} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800">Borrow Chart</h2>
                <p className="text-xs font-bold text-slate-400">Check out an available physical chart.</p>
              </div>
            </div>
            <ScanLine size={20} className="text-slate-300" />
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Barcode / Case No.</label>
              <input
                type="text"
                placeholder="CN-2026-XXX"
                value={borrowCaseNumber}
                onChange={(e) => setBorrowCaseNumber(e.target.value.toUpperCase())}
                className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-red-200 outline-none font-bold bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Borrower Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Richards"
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-red-200 outline-none font-bold bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-red-200 outline-none font-bold bg-white"
              >
                <option value="">Select department</option>
                {departmentOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={prepareCheckout}
            className="mt-4 w-full bg-red-500 text-white py-3 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#991b1b] active:shadow-none active:translate-y-1 transition-all inline-flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            Borrow Chart
          </button>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-50 text-green-700 border-2 border-green-100">
                <RotateCcw size={21} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800">Return Chart</h2>
                <p className="text-xs font-bold text-slate-400">Record who returned a borrowed chart.</p>
              </div>
            </div>
            <ScanLine size={20} className="text-slate-300" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Barcode / Case No.</label>
              <input
                type="text"
                placeholder="CN-2026-XXX"
                value={returnCaseNumber}
                onChange={(e) => setReturnCaseNumber(e.target.value.toUpperCase())}
                className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Returned By</label>
              <input
                type="text"
                placeholder="Name of person returning chart"
                value={returner}
                onChange={(e) => setReturner(e.target.value)}
                className="w-full border-2 border-black p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold bg-white"
              />
            </div>
          </div>

          <button
            onClick={prepareCheckin}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_#14532d] active:shadow-none active:translate-y-1 transition-all inline-flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Return Chart
          </button>
        </Motion.div>
      </div>

      <div>
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

          <div className="bg-white rounded-2xl border-2 border-black overflow-hidden shadow-sm">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-black">
                  <th className="w-[30%] p-3 text-[10px] font-black uppercase text-slate-400">Chart Info</th>
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase text-slate-400">Borrower</th>
                  <th className="w-[28%] p-3 text-[10px] font-black uppercase text-slate-400">Current Status</th>
                  <th className="w-[15%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {filteredCharts.map((chart) => {
                    const isOverdue = chart.status === "borrowed" && chart.dueDate && new Date(chart.dueDate) < today;
                    const recordType = determineChartRecordType(chart, charts);

                    return (
                      <Motion.tr
                        key={chart.caseNumber}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-3">
                          <div className="font-black text-slate-800 uppercase leading-tight mb-1 break-words">{chart.patientName}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <code className="text-xs font-mono text-green-900 font-black tracking-wide">{chart.caseNumber}</code>
                            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase ${
                              recordType === "old"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            }`}>
                              {recordType === "old" ? "Old / Readmit" : "New"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-black text-slate-700">{chart.borrower || "Records Room"}</div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">{chart.department || "Available"}</div>
                        </td>
                        <td className="p-3">
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
                        <td className="p-3 text-right">
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
                      <p className="font-black text-slate-700 uppercase">
                        {isLoading ? "Loading charts..." : "No charts found"}
                      </p>
                      <p className="text-sm text-slate-400 font-semibold mt-1">
                        {isLoading ? "Reading records from Firebase." : "Register a patient first or change the filters."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      <AnimatePresence>
        {confirmTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setConfirmTransaction(null)}
            />
            <Motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-white border-4 border-black rounded-2xl p-7 max-w-md w-full shadow-[10px_10px_0_0_rgba(0,0,0,1)]"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-3 rounded-2xl border-2 border-black ${
                  confirmTransaction.type === "borrow"
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-700"
                }`}>
                  {confirmTransaction.type === "borrow" ? <FileText size={24} /> : <RotateCcw size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    Confirm {confirmTransaction.type === "borrow" ? "Borrow" : "Return"} Chart
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Review transaction details before saving
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Chart</p>
                  <p className="font-black text-slate-900 uppercase">{confirmTransaction.chart.patientName}</p>
                  <p className="font-mono text-sm font-black text-green-800">{confirmTransaction.caseNumber}</p>
                </div>

                {confirmTransaction.type === "borrow" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Borrower</p>
                      <p className="font-black text-slate-800">{confirmTransaction.borrower}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Department</p>
                      <p className="font-black text-slate-800">{confirmTransaction.department}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-black uppercase text-slate-400">Due Date</p>
                      <p className="font-black text-slate-800">{confirmTransaction.dueDate}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Borrowed By</p>
                      <p className="font-black text-slate-800">{confirmTransaction.chart.borrower || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Returned By</p>
                      <p className="font-black text-slate-800">{confirmTransaction.returner}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Department</p>
                      <p className="font-black text-slate-800">{confirmTransaction.chart.department || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Due Date</p>
                      <p className="font-black text-slate-800">{confirmTransaction.chart.dueDate || "N/A"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmTransaction(null)}
                  className="flex-1 py-3 font-black text-slate-500 uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransaction.type === "borrow" ? handleCheckout : handleCheckin}
                  className={`flex-1 py-3 text-white border-2 border-black rounded-xl font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 ${
                    confirmTransaction.type === "borrow" ? "bg-red-500" : "bg-green-600"
                  }`}
                >
                  Confirm
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

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
                {(selectedHistory.history || []).filter((log) => log.borrower !== "System").length === 0 && (
                  <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-center">
                    <History size={34} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-black text-slate-700 uppercase">No history of borrowing or returned</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      This chart has not been borrowed or returned yet.
                    </p>
                  </div>
                )}
                {(selectedHistory.history || []).filter((log) => log.borrower !== "System").map((log, i) => (
                  <div key={`${log.action}-${log.date}-${i}`} className="relative pl-6 border-l-2 border-slate-200 pb-2 last:pb-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_2px_black] ${log.action === "checkout" ? "bg-red-500" : "bg-green-500"}`} />
                    <p className="text-sm font-black uppercase text-slate-800">{log.action === "checkout" ? "Borrowed" : "Returned"}</p>
                    <p className="text-xs font-bold text-slate-700">Borrowed By: {log.borrower || "N/A"}</p>
                    {log.action === "checkin" && (
                      <p className="text-xs font-bold text-slate-700">
                        Returned By: {log.returnedBy || log.borrower || "N/A"}
                      </p>
                    )}
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
