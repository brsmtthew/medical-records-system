import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ReportDeleteModal from "../modals/ReportDeleteModal";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteChartLog,
  subscribeToChartLogs,
  subscribeToChartRequests,
} from "../../charts/services/chartService";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";
import { readSystemSettings } from "@shared/utils/systemSettings";
import { recordTimeValue } from "@shared/utils/recordSorting";
import { statusBadgeClass, statusTextClass } from "@features/tracking/utils/trackingConfigs";

const rowsPerPage = 25;
const recordsFilters = ["all", "borrowed", "returned", "canceled"];
const requestFilters = ["all", "pending", "preparing", "ready", "received", "completed", "canceled"];

function getLogActivityDate(log) {
  if (log.action === "canceled") {
    return log.canceledAt || log.updatedAt || log.timestamp || log.borrowedAt || "";
  }

  if (log.action === "returned") {
    return log.returnedAt || log.timestamp || log.borrowedAt || "";
  }

  return log.borrowedAt || log.timestamp || "";
}

function getRequestActivityDate(request) {
  return request.completedAt
    || request.receivedAt
    || request.readyAt
    || request.preparedAt
    || request.canceledAt
    || request.updatedAt
    || request.createdAt
    || "";
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const time = recordTimeValue(value);
  if (!time) return "N/A";
  return formatDisplayDate(time);
}

function toDateKey(value) {
  const time = recordTimeValue(value);
  if (!time) return "";
  return new Date(time).toISOString().slice(0, 10);
}

function normalizeStatus(value, fallback = "pending") {
  return String(value || fallback).toLowerCase();
}

export default function Reports() {
  const { currentUser, isAdmin, userRole } = useAuth();
  const isRecordsUser = isMedicalRecordsRole(userRole);
  const canManageReports = isRecordsUser && isAdmin;
  const [systemSettings] = useState(readSystemSettings);
  const [reportRows, setReportRows] = useState([]);
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
  const [isDeletingLog, setIsDeletingLog] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadError("");

    const handleRows = (rows) => {
      setReportRows(isRecordsUser ? rows : rows.filter((row) => row.requestedById === currentUser?.uid));
      setIsLoading(false);
    };

    const handleError = (error) => {
      setLoadError(error.message || "Unable to load reports from Firebase.");
      setIsLoading(false);
    };

    return isRecordsUser
      ? subscribeToChartLogs(handleRows, handleError)
      : subscribeToChartRequests(handleRows, handleError);
  }, [currentUser?.uid, isRecordsUser]);

  const filterOptions = isRecordsUser ? recordsFilters : requestFilters;
  const actionLabel = isRecordsUser ? "Action" : "Status";
  const searchPlaceholder = isRecordsUser
    ? "Search patient, case number, borrower, returner, or department"
    : "Search patient, case number, request purpose, clinic, department, or status";

  useEffect(() => {
    if (!filterOptions.includes(actionFilter)) {
      setActionFilter("all");
      setCurrentPage(1);
    }
  }, [actionFilter, filterOptions]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((row) => {
      const status = isRecordsUser ? row.action : normalizeStatus(row.status);
      const activityDate = toDateKey(isRecordsUser ? getLogActivityDate(row) : getRequestActivityDate(row));
      const matchesAction = actionFilter === "all" || status === actionFilter;
      const searchBlob = isRecordsUser
        ? `${row.patientName || ""} ${row.caseNumber || ""} ${row.borrowedBy || ""} ${row.returnedBy || ""} ${row.department || ""} ${row.remarks || ""}`
        : `${row.patientName || ""} ${row.caseNumber || ""} ${row.purpose || ""} ${row.requestedBy || ""} ${row.requestedByClinic || ""} ${row.department || ""} ${row.status || ""} ${row.remarks || ""}`;
      const matchesSearch = searchBlob.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStart = !startDate || activityDate >= startDate;
      const matchesEnd = !endDate || activityDate <= endDate;

      return matchesAction && matchesSearch && matchesStart && matchesEnd;
    });
  }, [actionFilter, isRecordsUser, reportRows, searchTerm, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const stats = isRecordsUser
    ? [
        {
          label: "Total Number of Report Records",
          value: filteredRows.length,
          icon: FileText,
          tone: "green",
        },
        {
          label: "Total Number of Borrowed Charts",
          value: reportRows.filter((row) => row.action === "borrowed").length,
          icon: CalendarDays,
          tone: "blue",
        },
        {
          label: "Total Number of Returned Charts",
          value: reportRows.filter((row) => row.action === "returned").length,
          icon: RotateCcw,
          tone: "green",
        },
      ]
    : [
        {
          label: "Total Chart Requests",
          value: filteredRows.length,
          icon: FileText,
          tone: "green",
        },
        {
          label: "Ready For Pickup",
          value: reportRows.filter((row) => normalizeStatus(row.status) === "ready").length,
          icon: CheckCircle2,
          tone: "blue",
        },
        {
          label: "Completed Transactions",
          value: reportRows.filter((row) => normalizeStatus(row.status) === "completed").length,
          icon: RotateCcw,
          tone: "green",
        },
      ];

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

  const renderRecordsRows = () => paginatedRows.map((log) => (
    <tr key={log.id} className="mrs-table-row">
      <td className="p-3">
        <PatientCaseCell
          patientName={highlightSearch(log.patientName)}
          caseNumber={highlightSearch(log.caseNumber)}
        />
      </td>
      <td className="p-3">
        <p className={`text-xs font-black uppercase ${statusTextClass("borrowed")}`}>
          Borrowed: {highlightSearch(log.borrowedBy || "N/A")}
        </p>
        {log.action === "returned" && (
          <p className={`text-xs font-black uppercase ${statusTextClass("returned")}`}>
            Returned: {highlightSearch(log.returnedBy || log.borrowedBy || "N/A")}
          </p>
        )}
        <p className="text-[10px] font-bold uppercase text-slate-400">
          {highlightSearch(log.department)}
        </p>
      </td>
      <td className="p-3">
        <span
          className={`mrs-status-badge ${statusBadgeClass(log.action === "borrowed" ? "borrowed" : log.action === "canceled" ? "canceled" : "returned")}`}
        >
          {log.action === "borrowed" ? "borrowed" : log.action === "canceled" ? "canceled" : "returned"}
        </span>
      </td>
      <td className="p-3">
        <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("borrowed")}`}>
          Borrowed: {formatDateTime(log.borrowedAt || log.timestamp)}
        </p>
        {log.action === "returned" && (
          <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("returned")}`}>
            Returned: {formatDateTime(log.returnedAt)}
          </p>
        )}
        {log.action === "canceled" && (
          <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("canceled")}`}>
            Canceled: {formatDateTime(log.canceledAt || log.updatedAt)}
          </p>
        )}
      </td>
      <td className="p-3 text-[11px] font-semibold leading-snug text-slate-500 break-words">
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
  ));

  const renderRequestRows = () => paginatedRows.map((request) => {
    const status = normalizeStatus(request.status);

    return (
      <tr key={request.id} className="mrs-table-row">
        <td className="p-3">
          <PatientCaseCell
            patientName={highlightSearch(request.patientName)}
            caseNumber={highlightSearch(request.caseNumber)}
          />
        </td>
        <td className="p-3">
          <p className="text-xs font-black uppercase text-slate-700">
            {highlightSearch(request.purpose || "Chart request")}
          </p>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {highlightSearch(request.requestedByClinic || request.department || "Clinic")}
          </p>
        </td>
        <td className="p-3">
          <span className={`mrs-status-badge ${statusBadgeClass(status)}`}>
            {status}
          </span>
        </td>
        <td className="p-3">
          <p className="text-[10px] font-black uppercase leading-tight text-slate-500">
            Requested: {formatDateTime(request.createdAt)}
          </p>
          {request.preparedAt && (
            <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("borrowed")}`}>
              Prepared: {formatDateTime(request.preparedAt)}
            </p>
          )}
          {request.readyAt && (
            <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("returned")}`}>
              Ready: {formatDateTime(request.readyAt)}
            </p>
          )}
          {request.receivedAt && (
            <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("reviewed")}`}>
              Received: {formatDateTime(request.receivedAt)}
            </p>
          )}
          {request.completedAt && (
            <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("returned")}`}>
              Completed: {formatDateTime(request.completedAt)}
            </p>
          )}
          {request.canceledAt && (
            <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("canceled")}`}>
              Canceled: {formatDateTime(request.canceledAt)}
            </p>
          )}
        </td>
        <td className="p-3 text-[11px] font-semibold leading-snug text-slate-500 break-words">
          {highlightSearch(request.remarks || request.preparationNote || "N/A")}
        </td>
      </tr>
    );
  });

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {isRecordsUser
                ? "Audit chart movement, borrowed records, and return history."
                : "Review your chart request transaction history and pickup status."}
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-1.5 xl:justify-self-end xl:w-[min(56rem,100%)]">
            {stats.map((item) => (
              <div
                key={item.label}
                className="mrs-dashboard-stat mrs-dashboard-stat-fill mrs-surface rounded-xl p-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
                  </div>
                  <div
                    className={`rounded-lg p-1.5 ${
                      item.tone === "red"
                        ? "bg-red-100 text-red-700"
                        : item.tone === "blue"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    <item.icon size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mrs-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
            <div className="space-y-2 border-b border-slate-100 bg-slate-50 p-2 shrink-0">
              <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">Search</span>
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
                      placeholder={searchPlaceholder}
                      className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </label>
                <button
                  onClick={resetFilters}
                  className="mrs-soft-button mt-4 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                >
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-1.5">
                <div>
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">{actionLabel}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setActionFilter(filter);
                          setCurrentPage(1);
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                          actionFilter === filter
                            ? "border-green-700 bg-green-700 text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:text-green-700"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[900px] table-fixed text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="w-[19%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Patient / Case
                    </th>
                    <th className="w-[22%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isRecordsUser ? "Borrow / Return" : "Purpose / Unit"}
                    </th>
                    <th className="w-[12%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Status
                    </th>
                    <th className="w-[24%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isRecordsUser ? "Movement Dates" : "Transaction Dates"}
                    </th>
                    <th className="w-[14%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  {isRecordsUser ? renderRecordsRows() : renderRequestRows()}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={canManageReports ? 6 : 5} className="p-10 text-center">
                        <FileText size={38} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-black text-slate-700 uppercase">
                          {isLoading ? "Loading reports..." : "No records found"}
                        </p>
                        <p className="text-sm text-slate-400 font-semibold mt-1">
                          {isLoading
                            ? "Reading logs from Firebase."
                            : isRecordsUser
                              ? "Borrow or return a chart to create report logs."
                              : "Submit a chart request to create transaction reports."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500">
                Showing {paginatedRows.length} of {filteredRows.length} report rows
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
