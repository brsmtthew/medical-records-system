import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ChartRequestConfirmModal from "../modals/ChartRequestConfirmModal";
import { addChartRequest, subscribeToChartRequests, subscribeToCharts, updateChartRequest } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole, prefixedUserName, roleLabel } from "@shared/constants/userRoles";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { sanitizeText } from "@shared/utils/security";

const initialForm = {
  caseNumber: "",
  patientName: "",
  purpose: "",
  priority: "routine",
};

const statusMeta = {
  pending: { label: "Pending", badge: "mrs-status-warning", icon: Clock },
<<<<<<< HEAD
  accepted: { label: "Accepted", badge: "mrs-status-info", icon: CheckCircle2 },
=======
  reviewing: { label: "Reviewing", badge: "mrs-status-info", icon: ClipboardList },
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
  preparing: { label: "Preparing", badge: "mrs-status-info", icon: FileText },
  for_pickup: { label: "For Pick-Up", badge: "mrs-status-success", icon: ClipboardList },
  ready: { label: "For Pick-Up", badge: "mrs-status-success", icon: CheckCircle2 },
  received: { label: "Received", badge: "mrs-status-info", icon: ClipboardList },
<<<<<<< HEAD
  borrowed: { label: "Received", badge: "mrs-status-info", icon: FileText },
  for_return: { label: "For Return", badge: "mrs-status-warning", icon: RotateCcw },
  return_pending: { label: "For Return", badge: "mrs-status-warning", icon: RotateCcw },
=======
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
  returned: { label: "Returned", badge: "mrs-status-success", icon: RotateCcw },
  returnReceived: { label: "Return Received", badge: "mrs-status-info", icon: ClipboardList },
  completed: { label: "Completed", badge: "mrs-status-success", icon: CheckCircle2 },
  canceled: { label: "Canceled", badge: "mrs-status-danger", icon: XCircle },
};

const statusRemarks = {
  reviewing: "Request is being reviewed by Medical Records.",
  preparing: "Chart is being prepared for release.",
  ready: "Chart is ready for pickup.",
  received: "Requester confirmed chart receipt.",
  returned: "Chart was returned by the requester.",
  returnReceived: "Returned chart was received by Medical Records.",
  completed: "Chart request transaction completed.",
  canceled: "Chart request was canceled.",
};

function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

function searchable(value) {
  return String(value || "").toLowerCase();
}

function requesterDisplayName(request) {
  return prefixedUserName(request.requestedBy || "Unknown requester", request.requestedByRole);
}

function displayStatusFilter(filter) {
  return filter.replace("_", " ");
}

function requesterUnitLabel(request) {
  return request.requestedByClinic || request.requestedByDepartment || "No assignment";
}

function requesterPhysicianLabel(request) {
  if (request.requestedByRole === "doctor") return requesterDisplayName(request);
  return request.attendingDoctorName || request.physicianName || "";
}

function statusLabel(status) {
  return statusMeta[status]?.label || status || "Pending";
}

function requestDateRows(request) {
  return [
    ["Requested", request.createdAt, "text-slate-500"],
    ["Reviewed", request.reviewedAt, "mrs-status-text-reviewed"],
    ["Prepared", request.preparedAt, "mrs-status-text-borrowed"],
    ["Ready", request.readyAt, "mrs-status-text-success"],
    ["Received", request.receivedAt, "mrs-status-text-reviewed"],
    ["Returned", request.returnedAt, "mrs-status-text-success"],
    ["Return Received", request.returnReceivedAt, "mrs-status-text-reviewed"],
    ["Completed", request.completedAt, "mrs-status-text-success"],
    ["Canceled", request.canceledAt, "mrs-status-text-warning"],
  ].filter(([, value]) => Boolean(value));
}

export default function ChartRequests() {
  const location = useLocation();
  const { userProfile, userRole, currentUser } = useAuth();
  const isRecordsUser = isMedicalRecordsRole(userRole);
  const [requests, setRequests] = useState([]);
  const [charts, setCharts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [chartSearchTerm, setChartSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [transactionRequest, setTransactionRequest] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const routeSearchTerm = params.get("search") || "";
    if (!routeSearchTerm) return;

    setSearchTerm(routeSearchTerm);
    setStatusFilter("all");
  }, [location.search]);

  useEffect(() => {
    const unsubscribeRequests = subscribeToChartRequests(
      setRequests,
      (error) => setToast({ type: "error", message: error.message || "Unable to load chart requests from Firebase." }),
    );

    return () => unsubscribeRequests();
  }, []);

  useEffect(() => {
    if (isRecordsUser) return undefined;

    const unsubscribeCharts = subscribeToCharts(
      setCharts,
      (error) => setToast({ type: "error", message: error.message || "Unable to load available charts from Firebase." }),
    );

    return () => unsubscribeCharts();
  }, [isRecordsUser]);

  const visibleRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      if (!isRecordsUser && request.requestedById !== currentUser?.uid) return false;
      if (statusFilter === "active" && ["completed", "canceled"].includes(request.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "active" && request.status !== statusFilter) return false;
      if (!query) return true;

      return [
        request.caseNumber,
        request.patientName,
        request.requestedBy,
        request.requestedByDepartment,
        request.requestedByClinic,
        request.purpose,
        request.status,
      ].some((value) => searchable(value).includes(query));
    });
  }, [currentUser?.uid, isRecordsUser, requests, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const scopedRequests = isRecordsUser
      ? requests
      : requests.filter((request) => request.requestedById === currentUser?.uid);

    return [
      { label: "Active", value: scopedRequests.filter((request) => !["completed", "canceled"].includes(request.status)).length, icon: ClipboardList },
<<<<<<< HEAD
      { label: "For Pick-Up", value: scopedRequests.filter((request) => ["for_pickup", "ready"].includes(request.status)).length, icon: FileText },
      { label: "For Return", value: scopedRequests.filter((request) => request.status === "for_return").length, icon: RotateCcw },
=======
      { label: "Protected", value: scopedRequests.filter((request) => ["ready", "received", "returned"].includes(request.status)).length, icon: FileText },
      { label: "Returned", value: scopedRequests.filter((request) => request.status === "returned").length, icon: RotateCcw },
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
    ];
  }, [currentUser?.uid, isRecordsUser, requests]);

  const availableCharts = useMemo(() => {
    const query = chartSearchTerm.trim().toLowerCase();
    return charts.filter((chart) => {
      if (chart.status !== "available") return false;
      if (!query) return true;

      return [
        chart.caseNumber,
        chart.patientName,
        chart.patientDepartment,
        chart.attendingDoctorName,
        chart.attendingDoctorClinic,
        chart.patientType,
      ].some((value) => searchable(value).includes(query));
    });
  }, [chartSearchTerm, charts]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setToast(null);
  };

  const selectAvailableChart = (chart) => {
    setForm((current) => ({
      ...current,
      caseNumber: chart.caseNumber || "",
      patientName: chart.patientName || "",
    }));
    setToast(null);
  };

  const prepareSubmit = (event) => {
    event.preventDefault();
    const caseNumber = normalizeCaseNumber(form.caseNumber);
    const patientName = sanitizeText(form.patientName, { maxLength: 160, uppercase: true });
    const purpose = sanitizeText(form.purpose, { maxLength: 300 });

    if (!caseNumber || !patientName || !purpose) {
      setToast({ type: "error", message: "Enter the case number, patient name, and request purpose." });
      return;
    }

    setConfirmAction({
      type: "submit",
      caseNumber,
      patientName,
      purpose,
      priority: form.priority,
    });
  };

  const confirmSubmit = async () => {
    if (!confirmAction || confirmAction.type !== "submit") return;
    try {
      setIsSaving(true);
      await addChartRequest({
        caseNumber: confirmAction.caseNumber,
        patientName: confirmAction.patientName,
        purpose: confirmAction.purpose,
        priority: confirmAction.priority,
        requestedBy: userProfile?.fullName || currentUser?.displayName || currentUser?.email || "",
        requestedByEmail: userProfile?.email || currentUser?.email || "",
        requestedByDepartment: userProfile?.department || "",
        requestedByClinic: userProfile?.clinic || "",
      });
      setForm(initialForm);
      setToast({
        type: "success",
<<<<<<< HEAD
        title: "Chart Requested",
        message: `${confirmAction.caseNumber} is waiting for Medical Records approval.`,
=======
        title: "Request Submitted",
        message: `${confirmAction.caseNumber} was sent to Medical Records for review.`,
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
        action: "Chart Request Submitted",
        audit: true,
        caseNumber: confirmAction.caseNumber,
        patientName: confirmAction.patientName,
        targetPath: `/chart-requests?search=${encodeURIComponent(confirmAction.caseNumber)}`,
      });
      setConfirmAction(null);
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to send chart request." });
    } finally {
      setIsSaving(false);
    }
  };

  const setRequestStatus = async (request, status) => {
    setConfirmAction({
      type: status === "canceled" ? "cancel" : "status",
      request,
      status,
      caseNumber: request.caseNumber,
      patientName: request.patientName,
      purpose: request.purpose,
    });
  };

  const confirmStatusUpdate = async () => {
    if (!confirmAction || !["status", "cancel"].includes(confirmAction.type)) return;
    const { request, status } = confirmAction;
    const now = new Date().toISOString();
    const timeKey = {
      reviewing: "reviewedAt",
      preparing: "preparedAt",
      accepted: "acceptedAt",
      for_pickup: "forPickupAt",
      ready: "readyAt",
      received: "receivedAt",
<<<<<<< HEAD
      borrowed: "borrowedAt",
      for_return: "returnRequestedAt",
=======
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
      returned: "returnedAt",
      returnReceived: "returnReceivedAt",
      completed: "completedAt",
      canceled: "canceledAt",
    }[status];

    try {
      await updateChartRequest(request.id, {
        status,
        remarks: statusRemarks[status] || "",
        ...(timeKey ? { [timeKey]: now } : {}),
      });
      setToast({
        type: "success",
        title: "Request Updated",
        message: `${request.caseNumber} is now ${statusLabel(status)}.`,
        action: "Chart Request Updated",
        audit: true,
        caseNumber: request.caseNumber,
        patientName: request.patientName,
        targetPath: `/chart-requests?search=${encodeURIComponent(request.caseNumber || "")}`,
      });
      setConfirmAction(null);
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to update this request." });
    }
  };

<<<<<<< HEAD
  const statusFilters = ["active", "all", "pending", "accepted", "preparing", "for_pickup", "received", "for_return", "returned", "canceled"];
=======
  const statusFilters = ["active", "all", "pending", "reviewing", "preparing", "ready", "received", "returned", "returnReceived", "completed", "canceled"];
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,36rem)]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-700">Version 3</p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">
              Chart <span className="text-green-700">Requests</span>
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRecordsUser
<<<<<<< HEAD
                ? "Approve clinical chart requests, confirm physical returns, and track each handoff."
                : `Request charts for the ${roleLabel(userRole)} workspace; Medical Records must approve and confirm returns.`}
=======
                ? "Review requests, prepare charts, and lock folders only when they are ready for pickup."
                : `Request physical charts for the ${roleLabel(userRole)} workspace and return them when done.`}
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((item) => (
              <div key={item.label} className="mrs-card rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-1 text-xl font-black leading-none text-slate-800">{item.value}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-1.5 text-green-700">
                    <item.icon size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isRecordsUser && (
          <>
            <form onSubmit={prepareSubmit} className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-3">
              <div className="grid gap-2 lg:grid-cols-[11rem_minmax(0,1fr)_10rem_minmax(0,1.2fr)_auto]">
                <input
                  value={form.caseNumber}
                  onChange={(event) => updateForm("caseNumber", event.target.value.toUpperCase())}
                  placeholder="Case number"
                  className="mrs-field rounded-lg px-3 py-2 text-xs font-bold"
                />
                <input
                  value={form.patientName}
                  onChange={(event) => updateForm("patientName", event.target.value)}
                  placeholder="Patient name"
                  className="mrs-field rounded-lg px-3 py-2 text-xs font-bold"
                />
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                  className="mrs-field rounded-lg px-3 py-2 text-xs font-black uppercase"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input
                  value={form.purpose}
                  onChange={(event) => updateForm("purpose", event.target.value)}
                  placeholder="Request purpose / remarks"
                  className="mrs-field rounded-lg px-3 py-2 text-xs font-bold"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase disabled:opacity-60"
                >
<<<<<<< HEAD
                  <Send size={16} />
                  {isSaving ? "Requesting" : "Request"}
=======
                  {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSaving ? "Submitting" : "Submit"}
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                </button>
              </div>
            </form>

            <div className="mrs-panel shrink-0 overflow-hidden rounded-xl">
              <div className="mrs-section-band flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">Available Charts</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Click a row to fill the request form.</p>
                </div>
                <span className="mrs-status-badge mrs-status-success">{availableCharts.length} available</span>
              </div>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={chartSearchTerm}
                    onChange={(event) => setChartSearchTerm(event.target.value)}
                    placeholder="Search available charts by case, patient, department, or physician"
                    className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
                  />
                </div>
                <div className="max-h-52 overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full table-fixed text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="mrs-section-band border-b border-slate-200">
                        <th className="w-[32%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                        <th className="w-[19%] p-3 text-[10px] font-black uppercase text-slate-400">Department</th>
                        <th className="w-[24%] p-3 text-[10px] font-black uppercase text-slate-400">Attending Physician</th>
                        <th className="w-[10%] p-3 text-[10px] font-black uppercase text-slate-400">Type</th>
                        <th className="w-[15%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {availableCharts.map((chart) => (
                        <tr
                          key={chart.caseNumber}
                          className="mrs-table-row cursor-pointer"
                          onClick={() => selectAvailableChart(chart)}
                        >
                          <td className="p-3">
                            <PatientCaseCell patientName={chart.patientName} caseNumber={chart.caseNumber} />
                          </td>
                          <td className="p-3 text-xs font-black uppercase text-slate-700">{chart.patientDepartment || "No department"}</td>
                          <td className="p-3">
                            <p className="break-words text-xs font-black uppercase text-slate-700">
                              {chart.attendingDoctorName || "Unassigned"}
                            </p>
                            {chart.attendingDoctorClinic && (
                              <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">
                                {chart.attendingDoctorClinic}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="mrs-status-badge mrs-status-neutral">{chart.patientType || "record"}</span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                selectAvailableChart(chart);
                              }}
                              className="mrs-soft-button rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                      {availableCharts.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-6 text-center">
                            <p className="font-black uppercase text-slate-700">No available charts found</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">Try another search or ask Medical Records to verify chart status.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-2">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search case, patient, requester, purpose"
                className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                    statusFilter === filter
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
<<<<<<< HEAD
                  {displayStatusFilter(filter)}
=======
                  {filter === "all" || filter === "active" ? filter : statusLabel(filter)}
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mrs-panel min-h-0 flex-1 overflow-hidden rounded-xl">
          <div className="h-full overflow-x-hidden overflow-y-auto">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-200">
                  <th className="w-[17%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                  <th className="w-[15%] p-3 text-[10px] font-black uppercase text-slate-400">Requester</th>
                  <th className="w-[16%] p-3 text-[10px] font-black uppercase text-slate-400">Unit / Physician</th>
                  <th className="w-[14%] p-3 text-[10px] font-black uppercase text-slate-400">Purpose</th>
                  <th className="w-[12%] p-3 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="w-[14%] p-3 text-[10px] font-black uppercase text-slate-400">Transaction Dates</th>
                  <th className="w-[12%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((request) => {
                  const meta = statusMeta[request.status] || statusMeta.pending;
                  const StatusIcon = meta.icon;
                  const requesterUnit = requesterUnitLabel(request);
                  const requesterPhysician = requesterPhysicianLabel(request);
                  const dateRows = requestDateRows(request);

                  return (
                    <tr key={request.id} className="mrs-table-row">
                      <td className="p-3">
                        <PatientCaseCell patientName={request.patientName} caseNumber={request.caseNumber} />
                      </td>
                      <td className="p-3">
                        <p className="break-words text-xs font-black uppercase text-slate-800">{requesterDisplayName(request)}</p>
                        <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">{request.requestedByRole || "requester"}</p>
                      </td>
                      <td className="p-3">
                        <p className="break-words text-xs font-black uppercase text-slate-700">{requesterUnit}</p>
                        {requesterPhysician && (
                          <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">Physician: {requesterPhysician}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="break-words text-xs font-bold text-slate-700">{request.purpose}</p>
                        <p className={`mt-1 text-[10px] font-black uppercase ${request.priority === "urgent" ? "text-red-600" : "text-slate-400"}`}>
                          {request.priority || "routine"}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`mrs-status-badge gap-1 ${meta.badge}`}>
                          <StatusIcon size={13} />
                          {meta.label}
                        </span>
                        {(request.returnConfirmedBy || request.approvedBy || request.preparedBy) && (
                          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                            By {request.returnConfirmedBy || request.approvedBy || request.preparedBy}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setTransactionRequest(request)}
                          className="mrs-soft-button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                        >
                          <Eye size={14} />
                          View Dates
                          {dateRows.length > 0 && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] text-green-800">{dateRows.length}</span>
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          {isRecordsUser ? (
                            <>
                              {request.status === "pending" && (
<<<<<<< HEAD
                                <button type="button" onClick={() => setRequestStatus(request, "accepted")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Accept
                                </button>
                              )}
                              {request.status === "accepted" && (
=======
                                <button type="button" onClick={() => setRequestStatus(request, "reviewing")} className="mrs-soft-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Review
                                </button>
                              )}
                              {request.status === "reviewing" && (
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                                <button type="button" onClick={() => setRequestStatus(request, "preparing")} className="mrs-soft-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Prepare
                                </button>
                              )}
                              {request.status === "preparing" && (
                                <button type="button" onClick={() => setRequestStatus(request, "for_pickup")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  For Pick-Up
                                </button>
                              )}
<<<<<<< HEAD
                              {request.status === "for_return" && (
                                <button type="button" onClick={() => setRequestStatus(request, "returned")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Confirm Return
                                </button>
                              )}
                              {!["received", "for_return", "returned", "completed", "canceled"].includes(request.status) && (
=======
                              {request.status === "returned" && (
                                <button type="button" onClick={() => setRequestStatus(request, "returnReceived")} className="mrs-blue-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Receive
                                </button>
                              )}
                              {request.status === "returnReceived" && (
                                <button type="button" onClick={() => setRequestStatus(request, "completed")} className="mrs-blue-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Complete
                                </button>
                              )}
                              {!["ready", "received", "returned", "returnReceived", "completed", "canceled"].includes(request.status) && (
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {["for_pickup", "ready"].includes(request.status) && (
                                <button type="button" onClick={() => setRequestStatus(request, "received")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Received
                                </button>
                              )}
                              {request.status === "received" && (
<<<<<<< HEAD
                                <button type="button" onClick={() => setRequestStatus(request, "for_return")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  For Return
=======
                                <button type="button" onClick={() => setRequestStatus(request, "returned")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Return
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                                </button>
                              )}
                              {request.status === "pending" && (
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
<<<<<<< HEAD
                              {!["pending", "for_pickup", "ready", "received"].includes(request.status) && (
=======
                              {!["pending", "ready", "received"].includes(request.status) && (
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
                                <span className="text-[10px] font-black uppercase text-slate-400">No action</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-10 text-center">
                      <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No chart requests found</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        {isRecordsUser ? "New clinical chart requests will appear here." : "Request a physical chart when it is needed."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FloatingToast toast={toast} onClose={() => setToast(null)} />
      {transactionRequest && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close transaction dates"
            onClick={() => setTransactionRequest(null)}
          />
          <div className="mrs-panel relative w-full max-w-lg overflow-hidden rounded-2xl">
            <div className="mrs-section-band flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Transaction Dates</p>
                <p className="mt-1 break-words text-lg font-black uppercase text-slate-900">{transactionRequest.patientName || "No patient name"}</p>
                <p className="mt-1 font-mono text-xs font-black uppercase text-green-700">{transactionRequest.caseNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setTransactionRequest(null)}
                className="mrs-soft-button inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
                aria-label="Close transaction dates"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[65dvh] overflow-y-auto p-5">
              <div className="space-y-2">
                {requestDateRows(transactionRequest).map(([label, value, colorClass]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-700">
                        <CalendarDays size={15} />
                      </span>
                      <p className={`text-xs font-black uppercase ${colorClass}`}>{label}</p>
                    </div>
                    <p className="shrink-0 text-right text-xs font-black uppercase text-slate-700">{formatDisplayDate(value)}</p>
                  </div>
                ))}
                {requestDateRows(transactionRequest).length === 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
                    <CalendarDays size={30} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-black uppercase text-slate-700">No dates recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ChartRequestConfirmModal
        action={confirmAction}
        isSaving={isSaving}
        onCancel={() => {
          if (!isSaving) setConfirmAction(null);
        }}
        onConfirm={confirmAction?.type === "submit" ? confirmSubmit : confirmStatusUpdate}
      />
    </DashboardLayout>
  );
}
