import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ReportDeleteModal from "../modals/ReportDeleteModal";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  LoaderCircle,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteChartLog,
  subscribeToChartLogs,
  subscribeToChartRequests,
} from "../../charts/services/chartService";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { useAuth } from "@features/auth/context/useAuth";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";
import { readSystemSettings } from "@shared/utils/systemSettings";
import { recordTimeValue, sortNewestFirst } from "@shared/utils/recordSorting";
import { statusBadgeClass, statusTextClass } from "@features/tracking/utils/trackingConfigs";

const rowsPerPage = 25;
const recordsFilters = ["all", "borrowed", "returned", "canceled"];

// Canceling a chart request never writes a chart log, so map canceled requests into
// the chart-log shape used by the records report. They are read-only (no real log to
// delete) and can never collide with a borrow/return log because a canceled request
// never reached "ready".
function canceledRequestToLogRow(request) {
  return {
    id: `request-${request.id}`,
    _request: true,
    action: "canceled",
    patientName: request.patientName || "",
    caseNumber: request.caseNumber || "",
    borrowedBy: request.requestedBy || "Clinical requester",
    returnedBy: "",
    department: request.requestedByClinic || request.requestedByDepartment || "Clinic / Nurse Station",
    borrowedAt: "",
    returnedAt: "",
    canceledAt: request.canceledAt || request.updatedAt || "",
    timestamp: request.createdAt || "",
    remarks: request.purpose
      ? `Chart request canceled. Purpose: ${request.purpose}`
      : "Chart request canceled.",
  };
}
const requestFilters = ["all", "pending", "preparing", "ready", "received", "inReview", "returned", "returnReceived", "completed", "canceled"];
const recordsLegend = [
  { value: "borrowed", label: "Borrowed" },
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
  { value: "voided", label: "Voided" },
];

function getLogActivityDate(log) {
  if (log.action === "voided") {
    return log.voidedAt || log.updatedAt || log.returnedAt || log.timestamp || log.borrowedAt || "";
  }

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
    || request.returnReceivedAt
    || request.returnedAt
    || request.receivedAt
    || request.readyAt
    || request.preparedAt
    || request.reviewedAt
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

function requestStatusLabel(status) {
  if (status === "returnReceived" || status === "returnreceived") return "return received";
  if (status === "inReview" || status === "inreview") return "in review";
  return status;
}

function requesterName(request) {
  const name = request.requestedBy || "Unknown requester";
  if (request.requestedByRole === "doctor" && !name.toUpperCase().startsWith("DR.")) {
    return `DR. ${name}`;
  }
  return name;
}

function requesterUnitLabel(request) {
  return request.requestedByClinic || request.requestedByDepartment || request.department || "Clinic";
}

function requesterPhysicianLabel(request) {
  if (request.requestedByRole === "doctor") return requesterName(request);
  return request.attendingDoctorName || request.physicianName || "";
}

function requestDateRows(request) {
  return [
    ["Requested", request.createdAt, "text-slate-500"],
    ["Reviewed", request.reviewedAt, statusTextClass("reviewed")],
    ["Prepared", request.preparedAt, statusTextClass("preparing")],
    ["Ready", request.readyAt, statusTextClass("ready")],
    ["Received", request.receivedAt, statusTextClass("received")],
    ["In Review", request.inReviewAt, statusTextClass("inReview")],
    ["Returned", request.returnedAt, statusTextClass("returned")],
    ["Return Received", request.returnReceivedAt, statusTextClass("returnReceived")],
    ["Completed", request.completedAt, statusTextClass("completed")],
    ["Canceled", request.canceledAt, statusTextClass("canceled")],
  ].filter(([, value]) => Boolean(value));
}

function compactRequestDateRows(dateRows) {
  if (dateRows.length <= 2) return dateRows;
  const requestedRow = dateRows.find(([label]) => label === "Requested") || dateRows[0];
  const completedRow = dateRows.find(([label]) => label === "Completed");
  const latestRow = completedRow || dateRows[dateRows.length - 1];
  return requestedRow[0] === latestRow[0] ? [requestedRow] : [requestedRow, latestRow];
}

function requestReportRemark(request) {
  if (request.remarks || request.preparationNote) {
    return request.remarks || request.preparationNote;
  }

  const status = normalizeStatus(request.status);
  const statusRemarks = {
    pending: "Waiting for Medical Records review.",
    reviewing: "Request is being reviewed by Medical Records.",
    preparing: "Chart is being prepared for release.",
    ready: "Chart is ready for pickup.",
    received: "Requester confirmed chart receipt.",
    inreview: "Chart is being reviewed by the requester.",
    returned: "Chart was returned by the requester.",
    returnreceived: "Returned chart was received by Medical Records.",
    completed: "Chart request transaction completed.",
    canceled: "Chart request was canceled.",
  };

  return statusRemarks[status] || "No additional remarks.";
}

function StatusLegend({ options }) {
  if (!options.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black uppercase">
      {options.map((option) => (
        <span key={option.value} className={`mrs-status-badge ${statusBadgeClass(option.value)}`}>
          {option.label}
        </span>
      ))}
    </div>
  );
}

export default function Reports() {
  const location = useLocation();
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
  const [timelineRequest, setTimelineRequest] = useState(null);
  const [canceledRequestRows, setCanceledRequestRows] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const routeSearchTerm = params.get("search") || "";
    if (!routeSearchTerm) return;

    setSearchTerm(routeSearchTerm);
    setActionFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError("");

    const handleError = (error) => {
      setLoadError(error.message || "Unable to load reports from Firebase.");
      setIsLoading(false);
    };

    if (isRecordsUser) {
      // Records view = chart logs plus canceled chart requests (which never create a log).
      const unsubscribeLogs = subscribeToChartLogs((rows) => {
        setReportRows(rows);
        setIsLoading(false);
      }, handleError);
      const unsubscribeRequests = subscribeToChartRequests((rows) => {
        setCanceledRequestRows(rows.filter((row) => row.status === "canceled").map(canceledRequestToLogRow));
      }, handleError);
      return () => {
        unsubscribeLogs();
        unsubscribeRequests();
      };
    }

    setCanceledRequestRows([]);
    return subscribeToChartRequests((rows) => {
      setReportRows(rows.filter((row) => row.requestedById === currentUser?.uid));
      setIsLoading(false);
    }, handleError);
  }, [currentUser?.uid, isRecordsUser]);

  const filterOptions = isRecordsUser ? recordsFilters : requestFilters;
  // The colour legend is only shown in the records (chart-log) view, where it adds
  // the "Voided" key. The request view's filter chips already cover every status.
  const legendOptions = recordsLegend;
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

  const sourceRows = useMemo(
    () => (isRecordsUser ? sortNewestFirst([...reportRows, ...canceledRequestRows]) : reportRows),
    [isRecordsUser, reportRows, canceledRequestRows],
  );

  const debouncedSearch = useDebouncedValue(searchTerm);
  const filteredRows = useMemo(() => {
    return sourceRows.filter((row) => {
      const status = isRecordsUser ? row.action : normalizeStatus(row.status);
      const activityDate = toDateKey(isRecordsUser ? getLogActivityDate(row) : getRequestActivityDate(row));
      const matchesAction = actionFilter === "all" || status === actionFilter;
      const searchBlob = isRecordsUser
        ? `${row.patientName || ""} ${row.caseNumber || ""} ${row.borrowedBy || ""} ${row.returnedBy || ""} ${row.department || ""} ${row.remarks || ""}`
        : `${row.patientName || ""} ${row.caseNumber || ""} ${row.purpose || ""} ${row.requestedBy || ""} ${row.requestedByClinic || ""} ${row.department || ""} ${row.status || ""} ${requestReportRemark(row)}`;
      const matchesSearch = searchBlob.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStart = !startDate || activityDate >= startDate;
      const matchesEnd = !endDate || activityDate <= endDate;

      return matchesAction && matchesSearch && matchesStart && matchesEnd;
    });
  }, [actionFilter, isRecordsUser, sourceRows, debouncedSearch, startDate, endDate]);

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
      const outcome = await deleteChartLog(deleteLog.id);
      setSuccessMessage(outcome === "voided"
        ? `${deleteLog.caseNumber || "Report row"} was voided and kept in chart reports.`
        : `${deleteLog.caseNumber || "Report row"} was deleted.`);
      setSuccessMeta({
        patientName: deleteLog.patientName || "",
        caseNumber: deleteLog.caseNumber || "",
        action: outcome === "voided" ? "Report Row Voided" : "Report Row Deleted",
        audit: true,
        targetPath: `/reports?search=${encodeURIComponent(deleteLog.caseNumber || "")}`,
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
          className={`mrs-status-badge ${statusBadgeClass(["borrowed", "canceled", "voided"].includes(log.action) ? log.action : "returned")}`}
        >
          {["borrowed", "canceled", "voided"].includes(log.action) ? log.action : "returned"}
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
        {log.action === "voided" && (
          <p className={`text-[10px] font-black uppercase leading-tight ${statusTextClass("voided")}`}>
            Voided: {formatDateTime(log.voidedAt || log.updatedAt)}
          </p>
        )}
      </td>
      <td className="p-3 text-[11px] font-semibold leading-snug text-slate-500 break-words">
        {highlightSearch(log.remarks)}
      </td>
      {canManageReports && (
        <td className="p-3">
          <div className="flex justify-end gap-2">
            {log._request ? (
              <span className="px-1 text-sm font-black text-slate-300" title="Canceled chart request (read-only)">—</span>
            ) : (
              <button
                onClick={() => setDeleteLog(log)}
                className="p-2 rounded-xl border-2 border-transparent text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                aria-label={`Delete report row ${log.caseNumber}`}
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  ));

  const renderRequestRows = () => paginatedRows.map((request) => {
    const status = normalizeStatus(request.status);
    const requesterPhysician = requesterPhysicianLabel(request);
    const dateRows = requestDateRows(request);
    const summaryDateRows = compactRequestDateRows(dateRows);

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
          <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{highlightSearch(request.priority || "routine")}</p>
        </td>
        <td className="p-3">
          <p className="break-words text-xs font-black uppercase text-slate-700">
            {highlightSearch(requesterUnitLabel(request))}
          </p>
          {requesterPhysician && (
            <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">
              Physician: {highlightSearch(requesterPhysician)}
            </p>
          )}
        </td>
        <td className="p-3">
          <span className={`mrs-status-badge ${statusBadgeClass(status)}`}>
            {requestStatusLabel(status)}
          </span>
        </td>
        <td className="p-3">
          {summaryDateRows.map(([label, value, colorClass]) => (
            <p key={label} className={`text-[10px] font-black uppercase leading-tight ${colorClass}`}>
              {label}: {formatDateTime(value)}
            </p>
          ))}
          {dateRows.length > summaryDateRows.length && (
            <button
              type="button"
              onClick={() => setTimelineRequest(request)}
              className="mrs-soft-button mt-2 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase"
            >
              <Eye size={13} />
              Timeline
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] text-green-800">{dateRows.length}</span>
            </button>
          )}
        </td>
        <td className="p-3 text-[11px] font-semibold leading-snug text-slate-500 break-words">
          {highlightSearch(requestReportRemark(request))}
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
              {isRecordsUser && <StatusLegend options={legendOptions} />}

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
              <table className="w-full table-fixed text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white">
                    <th className={`${isRecordsUser ? "w-[19%]" : "w-[18%]"} whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
                      Patient / Case
                    </th>
                    <th className={`${isRecordsUser ? "w-[22%]" : "w-[18%]"} whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
                      {isRecordsUser ? "Borrow / Return" : "Purpose"}
                    </th>
                    {!isRecordsUser && (
                      <th className="w-[18%] whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Unit / Physician
                      </th>
                    )}
                    <th className={`${isRecordsUser ? "w-[12%]" : "w-[12%]"} whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
                      Status
                    </th>
                    <th className={`${isRecordsUser ? "w-[24%]" : "w-[20%]"} whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
                      {isRecordsUser ? "Movement Dates" : "Transaction Dates"}
                    </th>
                    <th className={`${isRecordsUser ? "w-[14%]" : "w-[14%]"} whitespace-normal p-3 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
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
                      <td colSpan={isRecordsUser ? (canManageReports ? 6 : 5) : 6} className="p-10 text-center">
                        {isLoading ? (
                          <LoaderCircle size={38} className="mx-auto mb-3 animate-spin text-green-700" />
                        ) : (
                          <FileText size={38} className="mx-auto text-slate-300 mb-3" />
                        )}
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
      {timelineRequest && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setTimelineRequest(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="timeline-title" className="mrs-panel relative w-full max-w-md rounded-2xl p-5">
            <button
              type="button"
              onClick={() => setTimelineRequest(null)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close transaction timeline"
            >
              <X size={18} />
            </button>
            <div className="pr-12">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Transaction Timeline</p>
              <h2 id="timeline-title" className="mt-1 break-words text-lg font-black uppercase text-slate-900">
                {timelineRequest.patientName || "Chart Request"}
              </h2>
              <p className="mt-1 font-mono text-xs font-black uppercase text-green-800">{timelineRequest.caseNumber}</p>
            </div>
            <div className="mt-4 space-y-2">
              {requestDateRows(timelineRequest).map(([label, value, colorClass]) => (
                <div key={label} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className={`text-xs font-black uppercase ${colorClass}`}>{label}</p>
                  <p className="text-right text-xs font-bold uppercase text-slate-700">{formatDateTime(value)}</p>
                </div>
              ))}
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
