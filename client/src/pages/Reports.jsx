import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import ReportDeleteModal from "../modals/reports/ReportDeleteModal";
import {
  CalendarDays,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteChartLog,
  subscribeToChartLogs,
} from "../services/chartService";
import { formatDisplayDate } from "../utils/dateFormatting";
import { useAuth } from "../context/useAuth";
import { readSystemSettings } from "../utils/systemSettings";
import { recordTimeValue } from "../utils/recordSorting";

// Chooses the timestamp that best represents the visible activity for each log row.
function getLogActivityDate(log) {
  if (log.action === "canceled") {
    return log.canceledAt || log.updatedAt || log.timestamp || log.borrowedAt || "";
  }

  if (log.action === "returned") {
    return log.returnedAt || log.timestamp || log.borrowedAt || "";
  }

  return log.borrowedAt || log.timestamp || "";
}

// Formats report timestamps as app-standard dates for table display and exports.
function formatDateTime(value) {
  if (!value) return "N/A";
  const time = recordTimeValue(value);
  if (!time) return "N/A";
  return formatDisplayDate(time);
}

// Converts a timestamp into yyyy-mm-dd for comparing date input filters.
function toDateKey(value) {
  const time = recordTimeValue(value);
  if (!time) return "";
  return new Date(time).toISOString().slice(0, 10);
}

// Escapes values before inserting them into the Excel-compatible HTML workbook.
function escapeExcelValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Builds and downloads a simple Excel-compatible report from the filtered table rows.
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
  const { isAdmin } = useAuth();
  const canManageReports = isAdmin;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isDeletingLog, setIsDeletingLog] = useState(false);

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
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const highlightSearch = (value) => {
    const text = String(value || "");
    const queryText = searchTerm.trim();
    if (!queryText) return text;

    const index = text.toLowerCase().indexOf(queryText.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <mark className="rounded bg-amber-100 px-0.5 text-amber-900">{text.slice(index, index + queryText.length)}</mark>
        {text.slice(index + queryText.length)}
      </>
    );
  };

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

  // Clears report filters while showing feedback when the table is already unfiltered.
  const resetFilters = () => {
    if (actionFilter === "all" && !searchTerm && !startDate && !endDate) {
      setInfoMessage("No report filters to reset.");
      return;
    }
    setActionFilter("all");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    setInfoMessage("Report filters were reset.");
  };

  // Deletes one audit row after the confirmation dialog is accepted.
  const handleDeleteLog = async () => {
    if (!deleteLog || isDeletingLog) return;
    try {
      setIsDeletingLog(true);
      await deleteChartLog(deleteLog.id);
      setSuccessMessage(`${deleteLog.caseNumber || "Report row"} was deleted.`);
      setSuccessMeta({
        patientName: deleteLog.patientName || "",
        caseNumber: deleteLog.caseNumber || "",
        action: "Report Row Deleted",
        audit: true,
      });
      setDeleteLog(null);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Unable to delete report row.");
    } finally {
      setIsDeletingLog(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 flex-col justify-between gap-2 xl:flex-row xl:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Audit chart movement, borrowed records, and return history.
            </p>
          </div>

          {canManageReports && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => downloadExcel(filteredLogs, systemSettings.reportExportFileName)}
                className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition"
              >
                <Download size={17} />
                Export Excel
              </button>
              <button
                onClick={() => window.print()}
                className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition"
              >
                <Printer size={17} />
                Print
              </button>
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2">
          {stats.map((item) => (
            <div
              key={item.label}
              className="mrs-surface rounded-xl p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xl font-black text-slate-800">{item.value}</p>
                </div>
                <div
                  className={`rounded-lg p-2 ${
                    item.tone === "red"
                      ? "bg-red-100 text-red-700"
                      : item.tone === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  <item.icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden xl:grid-cols-3">
          <div className="mrs-panel flex min-h-0 flex-col overflow-hidden rounded-xl xl:col-span-2">
            <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-3 shrink-0">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search patient, case number, borrower, returner, or department"
                    className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
                  />
                </div>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="mrs-field rounded-xl py-2.5 px-3 text-sm font-bold"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setCurrentPage(1);
                  }}
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
                    onClick={() => {
                      setActionFilter(filter);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase border-2 transition-colors ${
                      actionFilter === filter
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white text-slate-500 border-slate-200 hover:border-green-200 hover:text-green-700"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="mrs-field rounded-xl px-3 py-2 text-[11px] font-black uppercase"
                  aria-label="Rows per report page"
                >
                  <option value={10}>10 Rows</option>
                  <option value={25}>25 Rows</option>
                  <option value={50}>50 Rows</option>
                </select>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <table className={`w-full table-fixed text-left ${canManageReports ? "min-w-[980px]" : "min-w-[880px]"}`}>
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
                    {canManageReports && (
                      <th className="w-[9%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="mrs-table-row">
                      <td className="p-3">
                        <p className="font-black text-slate-800 break-words">{highlightSearch(log.patientName)}</p>
                        <p className="text-[10px] font-bold uppercase text-green-700">
                          {highlightSearch(log.caseNumber)}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-black text-slate-700">Borrowed: {highlightSearch(log.borrowedBy || "N/A")}</p>
                        {log.action === "returned" && (
                          <p className="text-sm font-black text-slate-700">
                            Returned: {highlightSearch(log.returnedBy || log.borrowedBy || "N/A")}
                          </p>
                        )}
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {highlightSearch(log.department)}
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
                        {highlightSearch(log.remarks)}
                      </td>
                      {canManageReports && (
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDeleteLog(log)}
                              className="p-2 rounded-xl border-2 border-transparent text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                              aria-label={`Delete report row ${log.caseNumber}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={canManageReports ? 6 : 5} className="p-10 text-center">
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
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500">
                Showing {paginatedLogs.length} of {filteredLogs.length} report rows
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="mrs-soft-button rounded-lg px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-black text-slate-600">
                  Page {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="mrs-soft-button rounded-lg px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="mrs-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
            <div className="p-4 border-b border-blue-100 bg-blue-50">
              <div className="flex items-center gap-2 text-blue-700">
                <FileText size={20} />
                <h2 className="font-black uppercase">Borrowed Charts</h2>
              </div>
              <p className="text-xs font-semibold text-blue-600 mt-1">
                Charts currently out of the records room.
              </p>
            </div>

            <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
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

      {canManageReports && (
        <ReportDeleteModal
          isDeleting={isDeletingLog}
          log={deleteLog}
          onCancel={() => setDeleteLog(null)}
          onConfirm={handleDeleteLog}
        />
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
