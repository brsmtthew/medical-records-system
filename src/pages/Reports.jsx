import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import {
  CalendarDays,
  CircleAlert,
  Download,
  FileText,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteChartLog,
  subscribeToChartLogs,
} from "../services/recordsService";
import { readSystemSettings } from "../utils/systemSettings";
import { recordTimeValue } from "../utils/recordSorting";

function getLogActivityDate(log) {
  if (log.action === "canceled") {
    return log.canceledAt || log.updatedAt || log.timestamp || log.borrowedAt || "";
  }

  if (log.action === "returned") {
    return log.returnedAt || log.timestamp || log.borrowedAt || "";
  }

  return log.borrowedAt || log.timestamp || "";
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const time = recordTimeValue(value);
  if (!time) return "N/A";
  return new Date(time).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateKey(value) {
  const time = recordTimeValue(value);
  if (!time) return "";
  return new Date(time).toISOString().slice(0, 10);
}

function escapeExcelValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadExcel(rows, fileName) {
  const headers = [
    "Patient",
    "People",
    "Action",
    "Timeline",
    "Remarks",
  ];

  const tableRows = rows.map((log) => {
    const people = [
      `Borrowed: ${log.borrowedBy || "N/A"}`,
      log.action === "returned" ? `Returned: ${log.returnedBy || log.borrowedBy || "N/A"}` : "",
      log.department || "",
    ].filter(Boolean);
    const timeline = [
      `Borrowed: ${formatDateTime(log.borrowedAt || log.timestamp)}`,
      log.action === "returned" ? `Returned: ${formatDateTime(log.returnedAt)}` : "",
      log.action === "canceled" ? `Canceled: ${formatDateTime(log.canceledAt || log.updatedAt)}` : "",
    ].filter(Boolean);

    return [
      `${log.patientName || ""}\n${log.caseNumber || ""}`,
      people.join("\n"),
      log.action === "borrowed" ? "borrowed" : log.action === "canceled" ? "canceled" : "returned",
      timeline.join("\n"),
      log.remarks || "",
    ];
  });

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #94a3b8; padding: 8px; vertical-align: top; white-space: pre-wrap; }
          th { background: #dcfce7; font-weight: 700; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeExcelValue(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows
              .map((row) => `<tr>${row.map((value) => `<td>${escapeExcelValue(value)}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || "chart-activity-report"}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [systemSettings] = useState(readSystemSettings);
  const [reportLogs, setReportLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionFilter, setActionFilter] = useState(systemSettings.defaultReportFilter || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteLog, setDeleteLog] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [successMeta, setSuccessMeta] = useState(null);

  useEffect(() => {
    return subscribeToChartLogs(
      (rows) => {
        setReportLogs(rows);
        setIsLoading(false);
      },
      (error) => {
        setLoadError(error.message || "Unable to load reports from Firebase.");
        setIsLoading(false);
      },
    );
  }, []);

  const filteredLogs = useMemo(() => {
    return reportLogs.filter((log) => {
      const logDate = toDateKey(getLogActivityDate(log));
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesSearch = `${log.patientName || ""} ${log.caseNumber || ""} ${log.borrowedBy || ""} ${log.returnedBy || ""} ${log.department || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;

      return matchesAction && matchesSearch && matchesStart && matchesEnd;
    });
  }, [actionFilter, reportLogs, searchTerm, startDate, endDate]);

  const activeBorrowed = reportLogs.filter((log) => log.action === "borrowed");

  const stats = [
    {
      label: "Total Number of Report Records",
      value: filteredLogs.length,
      icon: FileText,
      tone: "green",
    },
    {
      label: "Total Number of Borrowed Charts",
      value: activeBorrowed.length,
      icon: CalendarDays,
      tone: "blue",
    },
    {
      label: "Total Number of Returned Charts",
      value: reportLogs.filter((log) => log.action === "returned").length,
      icon: RotateCcw,
      tone: "green",
    },
  ];

  const resetFilters = () => {
    if (actionFilter === "all" && !searchTerm && !startDate && !endDate) {
      setInfoMessage("No report filters to reset.");
      return;
    }
    setActionFilter("all");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setInfoMessage("Report filters were reset.");
  };

  const handleDeleteLog = async () => {
    if (!deleteLog) return;
    try {
      await deleteChartLog(deleteLog.id);
      setSuccessMessage(`${deleteLog.caseNumber || "Report row"} was deleted.`);
      setSuccessMeta({
        patientName: deleteLog.patientName || "",
        caseNumber: deleteLog.caseNumber || "",
        action: "Report Row Deleted",
      });
      setDeleteLog(null);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Unable to delete report row.");
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-full lg:h-full lg:min-h-0 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Audit chart movement, borrowed records, and return history.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => downloadExcel(filteredLogs, systemSettings.reportExportFileName)}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase transition"
            >
              <Download size={17} />
              Export Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 shrink-0">
          {stats.map((item) => (
            <div
              key={item.label}
              className="mrs-surface rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{item.value}</p>
                </div>
                <div
                  className={`p-2.5 rounded-xl ${
                    item.tone === "red"
                      ? "bg-red-100 text-red-700"
                      : item.tone === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  <item.icon size={21} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3 flex-1 min-h-0 overflow-visible xl:overflow-hidden">
          <div className="mrs-panel xl:col-span-2 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-3 shrink-0">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search patient, case number, borrower, returner, or department"
                    className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
                  />
                </div>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mrs-field rounded-xl py-2.5 px-3 text-sm font-bold"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mrs-field rounded-xl py-2.5 px-3 text-sm font-bold"
                />
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-black uppercase text-slate-500 hover:border-black hover:text-black transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {["all", "borrowed", "returned", "canceled"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActionFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase border-2 transition-colors ${
                      actionFilter === filter
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white text-slate-500 border-slate-200 hover:border-green-200 hover:text-green-700"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible flex-1 min-h-0 xl:overflow-y-auto">
              <table className="w-full min-w-[980px] table-fixed text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="w-[19%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Patient
                    </th>
                    <th className="w-[22%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      People
                    </th>
                    <th className="w-[12%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Action
                    </th>
                    <th className="w-[24%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Timeline
                    </th>
                    <th className="w-[14%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Remarks
                    </th>
                    <th className="w-[9%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="mrs-table-row">
                      <td className="p-3">
                        <p className="font-black text-slate-800 break-words">{log.patientName}</p>
                        <p className="text-[10px] font-bold uppercase text-green-700">
                          {log.caseNumber}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-black text-slate-700">Borrowed: {log.borrowedBy || "N/A"}</p>
                        {log.action === "returned" && (
                          <p className="text-sm font-black text-slate-700">
                            Returned: {log.returnedBy || log.borrowedBy || "N/A"}
                          </p>
                        )}
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {log.department}
                        </p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase ${
                            log.action === "borrowed"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : log.action === "canceled"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {log.action === "borrowed" ? "borrowed" : log.action === "canceled" ? "canceled" : "returned"}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-bold text-slate-700">
                          Borrowed: {formatDateTime(log.borrowedAt || log.timestamp)}
                        </p>
                        {log.action === "returned" && (
                          <p className="text-sm font-bold text-slate-700">
                            Returned: {formatDateTime(log.returnedAt)}
                          </p>
                        )}
                        {log.action === "canceled" && (
                          <p className="text-sm font-bold text-amber-700">
                            Canceled: {formatDateTime(log.canceledAt || log.updatedAt)}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-500 break-words">
                        {log.remarks}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setDeleteLog(log)}
                            className="p-2 rounded-xl border-2 border-transparent hover:border-red-200 hover:bg-red-50 text-red-500 transition-colors"
                            aria-label={`Delete report row ${log.caseNumber}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center">
                        <FileText size={38} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-black text-slate-700 uppercase">
                          {isLoading ? "Loading reports..." : "No records found"}
                        </p>
                        <p className="text-sm text-slate-400 font-semibold mt-1">
                          {isLoading ? "Reading logs from Firebase." : "Borrow or return a chart to create report logs."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mrs-panel rounded-2xl overflow-hidden xl:h-full min-h-0 flex flex-col">
            <div className="p-4 border-b border-blue-100 bg-blue-50">
              <div className="flex items-center gap-2 text-blue-700">
                <FileText size={20} />
                <h2 className="font-black uppercase">Borrowed Charts</h2>
              </div>
              <p className="text-xs font-semibold text-blue-600 mt-1">
                Charts currently out of the records room.
              </p>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-visible xl:overflow-y-auto flex-1 min-h-0">
              {activeBorrowed.map((chart) => (
                <div key={chart.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 truncate">{chart.patientName}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        {chart.caseNumber}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200 uppercase">
                      Borrowed
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mt-3">
                    Borrowed by {chart.borrowedBy || "N/A"}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    {chart.department || "N/A"}
                  </p>
                </div>
              ))}

              {activeBorrowed.length === 0 && (
                <div className="p-8 text-center">
                  <p className="font-black text-slate-700 uppercase">No borrowed charts</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    All charts are currently returned.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteLog(null)} />
          <div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-7">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <CircleAlert size={30} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase">Delete Report Row?</h2>
            <p className="text-sm font-semibold text-slate-500 mt-2 mb-7">
              This removes the audit row for {deleteLog.caseNumber || "this chart"}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteLog(null)}
                className="py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLog}
                className="py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <FloatingToast
        toast={
          loadError
                ? { type: "error", message: loadError }
                : infoMessage
                  ? { type: "info", message: infoMessage }
                : successMessage
                ? { type: "success", title: "Report Updated", message: successMessage, ...successMeta }
                : null
        }
        onClose={() => {
          setLoadError("");
          setInfoMessage("");
          setSuccessMessage("");
          setSuccessMeta(null);
        }}
      />
    </DashboardLayout>
  );
}
