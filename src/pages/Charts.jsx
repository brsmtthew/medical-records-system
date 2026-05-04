import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  History,
  RotateCcw,
  Search,
  Table2,
  X,
} from "lucide-react";
import {
  addChartLog,
  fallbackDepartments,
  subscribeToCharts,
  subscribeToDepartments,
  updateChart,
  updateChartLogIfExists,
} from "../services/recordsService";
import { buildReturnedChartLog, buildReturnedChartUpdate } from "../utils/chartTransactions";
import { formatDisplayDate } from "../utils/dateFormatting";

const today = new Date();
const transactionModes = [
  {
    id: "borrow",
    label: "Borrow Chart",
    description: "Check out an available physical chart.",
    icon: FileText,
    tone: "blue",
  },
  {
    id: "return",
    label: "Return Chart",
    description: "Check in a borrowed chart back to records.",
    icon: RotateCcw,
    tone: "green",
  },
];

// Keeps manually typed or scanned case numbers in one searchable format.
function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

// Normalizes chart patient names before grouping records for read-only labels.
function normalizePatientName(value = "") {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

// Converts nullable table fields into search-safe text.
function searchable(value) {
  return String(value || "").toLowerCase();
}

// Picks the oldest available timestamp for record-type calculations.
function chartCreatedValue(chart) {
  if (chart.createdAt?.toMillis) return chart.createdAt.toMillis();
  if (chart.createdAt?.seconds) return chart.createdAt.seconds * 1000;
  if (chart.borrowedAt) return new Date(chart.borrowedAt).getTime();
  return Number.MAX_SAFE_INTEGER;
}

// Determines whether the chart is the first record for the patient or a readmission.
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

// Counts whole calendar days since a chart was checked out.
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

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white p-3 font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const softButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";
const modalCardClass =
  "relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20 sm:p-6";

export default function Charts() {
  const [charts, setCharts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [borrowCaseNumber, setBorrowCaseNumber] = useState("");
  const [returnCaseNumber, setReturnCaseNumber] = useState("");
  const [borrower, setBorrower] = useState("");
  const [department, setDepartment] = useState("");
  const [returner, setReturner] = useState("");
  const [transactionMode, setTransactionMode] = useState("");
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [confirmTransaction, setConfirmTransaction] = useState(null);
  const [notice, setNotice] = useState(null);
  const [transactionToast, setTransactionToast] = useState(null);

  // Shows an inline toast-style notice for transaction validation.
  const setTransactionNotice = (type, message) => {
    setNotice({ type, message });
  };

  // Publishes successful borrow/return actions to the shared notification log.
  const showTransactionToast = (title, message, details = {}) => {
    setTransactionToast({ title, message, audit: true, ...details });
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
  const activeTransaction = transactionModes.find((mode) => mode.id === transactionMode);
  const activeCaseNumber = transactionMode === "return" ? returnCaseNumber : borrowCaseNumber;

  // Selects borrow or return mode and primes the matching table filter.
  const selectTransactionMode = (mode) => {
    setTransactionMode(mode);
    setStatusFilter(mode === "borrow" ? "available" : "borrowed");
    setNotice(null);
  };

  // Routes case-number input into the active transaction form.
  const setCaseNumberForActiveMode = (caseNumber) => {
    const normalizedCaseNumber = normalizeCaseNumber(caseNumber);
    if (transactionMode === "return") {
      setReturnCaseNumber(normalizedCaseNumber);
    } else {
      setBorrowCaseNumber(normalizedCaseNumber);
    }
  };

  // Clears borrow transaction fields with feedback when there is nothing to reset.
  const resetBorrowForm = () => {
    if (!borrowCaseNumber && !borrower && !department) {
      setTransactionNotice("info", "No borrow transaction details to reset.");
      return;
    }
    setBorrowCaseNumber("");
    setBorrower("");
    setDepartment("");
    setTransactionNotice("info", "Borrow transaction details were reset.");
  };

  // Clears return transaction fields with feedback when there is nothing to reset.
  const resetReturnForm = () => {
    if (!returnCaseNumber && !returner) {
      setTransactionNotice("info", "No return transaction details to reset.");
      return;
    }
    setReturnCaseNumber("");
    setReturner("");
    setTransactionNotice("info", "Return transaction details were reset.");
  };

  // Lets operators click a valid chart row to fill the active case number.
  const handleChartRowSelect = (chart) => {
    if (!transactionMode) return;
    const isBorrowMode = transactionMode === "borrow";

    if (isBorrowMode && chart.status === "borrowed") {
      setTransactionNotice("error", "This chart is already borrowed. Switch to Return Chart to check it in.");
      return;
    }

    if (!isBorrowMode && chart.status !== "borrowed") {
      setTransactionNotice("error", "This chart is already available. Switch to Borrow Chart to check it out.");
      return;
    }

    setCaseNumberForActiveMode(chart.caseNumber);
    setNotice(null);
  };

  const stats = useMemo(() => {
    const borrowed = charts.filter((chart) => chart.status === "borrowed");

    return [
      { label: "Total Charts", value: charts.length, icon: Archive, color: "bg-green-100 text-green-700" },
      { label: "Available", value: charts.filter((chart) => chart.status === "available").length, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
      { label: "Borrowed", value: borrowed.length, icon: Clock, color: "bg-blue-100 text-blue-700" },
    ];
  }, [charts]);

  const filteredCharts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return charts.filter((chart) => {
      const matchesStatus =
        statusFilter === "all" ||
        chart.status === statusFilter;
      const matchesSearch =
        !query ||
        searchable(chart.patientName).includes(query) ||
        searchable(chart.caseNumber).includes(query) ||
        searchable(chart.borrower).includes(query) ||
        searchable(chart.department).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [charts, searchQuery, statusFilter]);

  // Validates borrow details and opens the confirmation dialog.
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

    setConfirmTransaction({
      type: "borrow",
      chart,
      caseNumber,
      borrower: borrower.trim(),
      department,
    });
  };

  // Writes the borrow log and marks the selected chart as out of records.
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
      dueDate: "",
      remarks: "Chart checked out",
    };

    try {
      const activeLogId = await addChartLog(log);
      await updateChart(caseNumber, {
        status: "borrowed",
        borrower: confirmTransaction.borrower,
        department: confirmTransaction.department,
        borrowedAt: now.toISOString(),
        dueDate: "",
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
      setNotice(null);
      showTransactionToast("Checkout Complete", `${caseNumber} was checked out successfully.`, {
        patientName: chart.patientName,
        caseNumber,
        action: "Chart Borrowed",
      });
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    }
  };

  // Validates return details and opens the confirmation dialog.
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

  // Writes the return log and marks the selected chart as available.
  const handleCheckin = async () => {
    if (!confirmTransaction || confirmTransaction.type !== "return") return;
    const { chart, caseNumber } = confirmTransaction;
    const now = new Date();
    const returnedAt = now.toISOString();
    const returnedLog = buildReturnedChartLog({
      chart,
      caseNumber,
      returner: confirmTransaction.returner,
      returnedAt,
    });

    try {
      if (chart.activeLogId) {
        const updatedActiveLog = await updateChartLogIfExists(chart.activeLogId, returnedLog);

        if (!updatedActiveLog) {
          await addChartLog({
            ...returnedLog,
            remarks: "Chart returned after borrowed report row was deleted",
          });
        }
      } else {
        await addChartLog(returnedLog);
      }

      await updateChart(caseNumber, buildReturnedChartUpdate({
        chart,
        returner: confirmTransaction.returner,
        returnedAt,
      }));
      setReturnCaseNumber("");
      setReturner("");
      setConfirmTransaction(null);
      setNotice(null);
      showTransactionToast("Return Complete", `${caseNumber} was returned successfully.`, {
        patientName: chart.patientName,
        caseNumber,
        action: "Chart Returned",
      });
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-full lg:h-full lg:min-h-0 flex flex-col overflow-visible lg:overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 mb-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
            Chart <span className="text-green-700">Tracking</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Physical record circulation, borrower accountability, and return monitoring.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3 shrink-0">
        {stats.map((item) => (
          <div key={item.label} className="mrs-surface rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="text-xl font-black text-slate-800 mt-1">{item.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${item.color}`}>
                <item.icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mrs-panel rounded-2xl p-4 mb-3 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-green-50 text-green-700">
            <Table2 size={21} />
          </div>
          <div>
            <h2 className="font-black uppercase text-slate-800">Select Transaction</h2>
            <p className="text-xs font-bold text-slate-400">
              Choose a mode, then scan a barcode or click a chart row to fill the case number.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {transactionModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = transactionMode === mode.id;
            const activeClass = mode.tone === "blue"
              ? "border-blue-200 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
              : "border-green-200 bg-green-50 text-green-700 ring-4 ring-green-100";

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => selectTransactionMode(mode.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  isActive ? activeClass : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <Icon size={22} />
                <span>
                  <span className="block text-sm font-black uppercase">{mode.label}</span>
                  <span className={`block text-xs font-semibold mt-0.5 ${isActive ? "opacity-75" : "text-slate-500"}`}>
                    {mode.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTransaction && (
        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mrs-panel rounded-2xl p-4 mb-3 shrink-0"
        >
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="space-y-1 flex-1">
              <div>
                <input
                  type="text"
                  placeholder="Scan with barcode device or click a chart row"
                  aria-label="Barcode or case number"
                  value={activeCaseNumber}
                  onChange={(event) => setCaseNumberForActiveMode(event.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            {transactionMode === "borrow" ? (
              <>
                <div className="space-y-1 flex-1">
                  <input
                    type="text"
                    placeholder="Borrower name"
                    aria-label="Borrower Name"
                    value={borrower}
                    onChange={(event) => setBorrower(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className={fieldClass}
                    aria-label="Department"
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resetBorrowForm}
                    className={softButtonClass}
                  >
                    <RotateCcw size={17} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={prepareCheckout}
                    className="mrs-blue-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase transition"
                  >
                    <FileText size={17} />
                    Borrow
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 flex-1">
                  <input
                    type="text"
                    placeholder="Name of person returning chart"
                    aria-label="Returned By"
                    value={returner}
                    onChange={(event) => setReturner(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resetReturnForm}
                    className={softButtonClass}
                  >
                    <RotateCcw size={17} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={prepareCheckin}
                    className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase transition"
                  >
                    <RotateCcw size={17} />
                    Return
                  </button>
                </div>
              </>
            )}
          </div>
        </Motion.div>
      )}

      {activeTransaction && (
        <div className="flex-1 min-h-0 flex flex-col overflow-visible lg:overflow-hidden">
          <div className="mb-3 space-y-2 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase text-slate-400">
                Click a patient row to use its case number for {activeTransaction.label.toLowerCase()}.
              </p>
              <div className="flex flex-wrap gap-2">
                {["all", "available", "borrowed"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase border transition-colors ${
                      statusFilter === filter
                        ? "border-green-700 bg-green-700 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-black transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search patient, case, borrower, department"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="mrs-panel rounded-2xl overflow-hidden">
            <div className="max-h-full overflow-x-auto overflow-y-visible lg:overflow-y-auto">
            <table className="w-full min-w-[780px] table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-[30%] p-3 text-[10px] font-black uppercase text-slate-400">Chart Info</th>
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase text-slate-400">Borrower</th>
                  <th className="w-[28%] p-3 text-[10px] font-black uppercase text-slate-400">Current Status</th>
                  <th className="w-[15%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {filteredCharts.map((chart) => {
                    const recordType = determineChartRecordType(chart, charts);
                    const isSelected = activeCaseNumber === chart.caseNumber;

                    return (
                      <Motion.tr
                        key={chart.caseNumber}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => handleChartRowSelect(chart)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleChartRowSelect(chart);
                          }
                        }}
                        role="button"
                        aria-selected={isSelected}
                        tabIndex={0}
                        className={`mrs-table-row group cursor-pointer ${
                          isSelected ? "mrs-table-row-selected" : ""
                        }`}
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
                              {recordType === "old" ? "Old / Readmit" : "First Admission"}
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
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {chart.status}
                            </span>
                            {chart.status === "borrowed" && (
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                {daysBorrowed(chart.borrowedAt)} day(s) borrowed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedHistory(chart);
                            }}
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
        </div>
      )}
      </div>

      <FloatingToast toast={notice} onClose={() => setNotice(null)} />
      <FloatingToast
        toast={transactionToast ? { type: "success", ...transactionToast } : null}
        onClose={() => setTransactionToast(null)}
      />

      <AnimatePresence>
        {confirmTransaction && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
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
              className={`${modalCardClass} max-w-md sm:p-7`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-3 rounded-2xl ${
                  confirmTransaction.type === "borrow"
                    ? "bg-blue-50 text-blue-700"
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

              <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Chart</p>
                  <p className="font-black text-slate-900 uppercase">{confirmTransaction.chart.patientName}</p>
                  <p className="font-mono text-sm font-black text-green-800">{confirmTransaction.caseNumber}</p>
                </div>

                {confirmTransaction.type === "borrow" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Borrower</p>
                      <p className="font-black text-slate-800">{confirmTransaction.borrower}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Department</p>
                      <p className="font-black text-slate-800">{confirmTransaction.department}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className={`flex-1 rounded-xl py-3 font-black uppercase text-white shadow-lg transition ${
                    confirmTransaction.type === "borrow" ? "mrs-blue-button" : "bg-green-600"
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
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${modalCardClass} max-w-md sm:p-8`}
            >
              <button
                onClick={() => setSelectedHistory(null)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="pr-9 text-xl sm:text-2xl font-black uppercase italic text-slate-800 mb-1">Circulation History</h2>
              <p className="text-xs font-bold text-slate-400 uppercase mb-6">
                {selectedHistory.patientName} - {selectedHistory.caseNumber}
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
              <button onClick={() => setSelectedHistory(null)} className="mrs-primary-button w-full mt-8 rounded-xl py-3 font-black uppercase text-xs transition">Close Log</button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
