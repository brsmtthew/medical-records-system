import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ChartHistoryModal from "../modals/ChartHistoryModal";
import ChartTransactionConfirmModal from "../modals/ChartTransactionConfirmModal";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  History,
  LoaderCircle,
  RotateCcw,
  Search,
  Table2,
} from "lucide-react";
import {
  checkoutChart,
  fallbackDepartments,
  returnChart,
  subscribeToCharts,
  subscribeToDepartments,
} from "@features/charts/services/chartService";
import { buildReturnedChartLog, buildReturnedChartUpdate } from "@features/charts/utils/chartTransactions";
import { normalizeCaseNumber, normalizePatientName, searchable } from "@shared/utils/recordSorting";

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

// Picks the oldest available timestamp for record-type calculations.
function chartCreatedValue(chart) {
  if (chart.admissionDate) {
    const admissionTime = new Date(chart.admissionDate).getTime();
    if (!Number.isNaN(admissionTime)) return admissionTime;
  }
  if (chart.createdAt?.toMillis) return chart.createdAt.toMillis();
  if (chart.createdAt?.seconds) return chart.createdAt.seconds * 1000;
  if (chart.borrowedAt) return new Date(chart.borrowedAt).getTime();
  return Number.MAX_SAFE_INTEGER;
}

// Determines whether the chart is the first record for the patient or a readmission.
function determineChartRecordType(chart, charts) {
  const patientName = normalizePatientName(chart.patientName);
  const relatedCharts = charts
    .filter((item) => normalizePatientName(item.patientName) === patientName)
    .sort((a, b) => {
      const createdDifference = chartCreatedValue(a) - chartCreatedValue(b);
      if (createdDifference !== 0) return createdDifference;
      return a.caseNumber.localeCompare(b.caseNumber);
    });

  if (relatedCharts.some((item) => item.admissionDate)) {
    return relatedCharts.findIndex((item) => item.caseNumber === chart.caseNumber) > 0 ? "old" : "new";
  }

  if (chart.recordType === "old") return "old";
  if (chart.recordType === "new") return "new";
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
  "mrs-field w-full rounded-lg px-3 py-2 text-xs font-bold outline-none transition placeholder:text-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-100";
const softButtonClass =
  "mrs-soft-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase";

export default function Charts() {
  const location = useLocation();
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
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const routeSearchQuery = params.get("search") || "";
    if (!routeSearchQuery) return;

    setSearchQuery(routeSearchQuery);
    setStatusFilter("all");
  }, [location.search]);

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
        searchable(chart.department).includes(query) ||
        searchable(chart.attendingDoctorName).includes(query) ||
        searchable(chart.attendingDoctorClinic).includes(query);

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
    if (!confirmTransaction || confirmTransaction.type !== "borrow" || isSavingTransaction) return;
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
      setIsSavingTransaction(true);
      await checkoutChart(caseNumber, log, {
        status: "borrowed",
        borrower: confirmTransaction.borrower,
        department: confirmTransaction.department,
        borrowedAt: now.toISOString(),
        dueDate: "",
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
        targetPath: `/charts?search=${encodeURIComponent(caseNumber)}`,
      });
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    } finally {
      setIsSavingTransaction(false);
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
    if (!confirmTransaction || confirmTransaction.type !== "return" || isSavingTransaction) return;
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
      setIsSavingTransaction(true);
      await returnChart(caseNumber, returnedLog, buildReturnedChartUpdate({
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
        targetPath: `/charts?search=${encodeURIComponent(caseNumber)}`,
      });
    } catch (error) {
      setTransactionNotice("error", error.message || "Unable to update chart in Firebase.");
      setConfirmTransaction(null);
    } finally {
      setIsSavingTransaction(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
            Chart <span className="text-green-700">Circulation</span>
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Physical record circulation, borrower accountability, and return monitoring.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-1.5 xl:justify-self-end xl:w-[min(56rem,100%)]">
          {stats.map((item) => (
            <div key={item.label} className="mrs-dashboard-stat mrs-dashboard-stat-fill mrs-surface rounded-xl border border-slate-200 p-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
                </div>
                <div className={`rounded-lg p-1.5 ${item.color}`}>
                  <item.icon size={15} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mrs-panel shrink-0 overflow-hidden rounded-xl">
        <div className="mrs-section-band flex items-center gap-3 border-b border-slate-100 px-3 py-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-2 text-green-700">
            <Table2 size={18} />
          </div>
          <div>
            <h2 className="font-black uppercase leading-none text-slate-800">Transaction Management</h2>
            <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
              Choose a mode, then scan or click a chart row.
            </p>
          </div>
        </div>
        <div className="grid gap-2 p-2 md:grid-cols-2">
          {transactionModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = transactionMode === mode.id;
            const activeClass = mode.tone === "blue"
              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
              : "border-green-300 bg-green-50 text-green-700 shadow-sm";

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => selectTransactionMode(mode.id)}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                  isActive ? activeClass : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <div className={`rounded-lg border p-1.5 ${isActive ? "border-current bg-white/70" : "border-slate-200 bg-slate-50"}`}>
                  <Icon size={18} />
                </div>
                <span>
                  <span className="block text-xs font-black uppercase">{mode.label}</span>
                  <span className={`mt-0.5 block text-[10px] font-semibold uppercase ${isActive ? "opacity-75" : "text-slate-500"}`}>
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
          className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-2"
        >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
                    className="mrs-blue-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase transition"
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
                    className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase transition"
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mrs-panel mrs-filter-strip shrink-0 space-y-1.5 rounded-xl p-2">
          <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
            <p className="text-xs font-bold uppercase text-slate-400">
              {activeTransaction
                ? `Click a patient row to use its case number for ${activeTransaction.label.toLowerCase()}.`
                : "Choose borrow or return above, then click a chart row or search by patient/case."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["all", "available", "borrowed"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
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

          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={15} className="text-slate-400 transition-colors group-focus-within:text-green-700" />
            </div>
            <input
              type="text"
              placeholder="Search patient, case, borrower, department, or physician"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={fieldClass.replace("px-3", "pl-9 pr-3").replace("py-3", "py-2")}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mrs-panel mt-2 min-h-0 flex-1 overflow-hidden rounded-xl">
            <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-200">
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                  <th className="w-[22%] p-3 text-[10px] font-black uppercase text-slate-400">Attending Physician</th>
                  <th className="w-[21%] p-3 text-[10px] font-black uppercase text-slate-400">Holder / Dept.</th>
                  <th className="w-[18%] p-3 text-[10px] font-black uppercase text-slate-400">Chart Status</th>
                  <th className="w-[12%] p-3 text-right text-[10px] font-black uppercase text-slate-400">History</th>
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
                          <PatientCaseCell patientName={chart.patientName} caseNumber={chart.caseNumber} />
                          <div className="flex flex-wrap items-center gap-2 mt-1">
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
                          <div className="break-words text-xs font-black uppercase text-slate-700">{chart.attendingDoctorName || "Unassigned"}</div>
                          <div className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">{chart.attendingDoctorClinic || "No clinic"}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-xs font-black uppercase text-slate-700">{chart.borrower || "Records Room"}</div>
                          <div className="text-[10px] font-bold uppercase text-slate-400">{chart.department || "Available"}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`mrs-status-badge ${
                              chart.status === "available"
                                ? "mrs-status-success"
                                : "mrs-status-info"
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
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
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
                    <td colSpan="5" className="p-10 text-center">
                      {isLoading ? (
                        <LoaderCircle size={40} className="mx-auto mb-3 animate-spin text-green-700" />
                      ) : (
                        <Archive size={40} className="mx-auto text-slate-300 mb-3" />
                      )}
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
      </div>
      </div>

      <FloatingToast toast={notice} onClose={() => setNotice(null)} />
      <FloatingToast
        toast={transactionToast ? { type: "success", ...transactionToast } : null}
        onClose={() => setTransactionToast(null)}
      />

      <ChartTransactionConfirmModal
        isSaving={isSavingTransaction}
        onCancel={() => setConfirmTransaction(null)}
        onConfirmBorrow={handleCheckout}
        onConfirmReturn={handleCheckin}
        transaction={confirmTransaction}
      />
      <ChartHistoryModal
        chart={selectedHistory}
        onClose={() => setSelectedHistory(null)}
      />
    </DashboardLayout>
  );
}
