import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
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
import { isMedicalRecordsRole, roleLabel } from "@shared/constants/userRoles";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { sanitizeText } from "@shared/utils/security";
import { normalizeCaseNumber, searchable } from "@shared/utils/recordSorting";

const initialForm = {
  caseNumber: "",
  patientName: "",
  purpose: "",
  priority: "routine",
};

const statusMeta = {
  pending: { label: "Pending", badge: "mrs-status-warning", icon: Clock },
  reviewing: { label: "Reviewing", badge: "mrs-status-info", icon: ClipboardList },
  preparing: { label: "Preparing", badge: "mrs-status-info", icon: FileText },
  ready: { label: "Ready", badge: "mrs-status-success", icon: CheckCircle2 },
  received: { label: "Received", badge: "mrs-status-info", icon: ClipboardList },
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

// Ordered handoff steps so the whole request journey can be shown as a timeline.
const requestFlowSteps = [
  { key: "pending", label: "Requested", owner: "Requester", timeKey: "createdAt" },
  { key: "preparing", label: "Preparing", owner: "Medical Records", timeKey: "preparedAt" },
  { key: "ready", label: "Ready for Pickup", owner: "Medical Records", timeKey: "readyAt" },
  { key: "received", label: "Picked Up", owner: "Requester", timeKey: "receivedAt" },
  { key: "returned", label: "Returned", owner: "Requester", timeKey: "returnedAt" },
  { key: "returnReceived", label: "Return Received", owner: "Medical Records", timeKey: "returnReceivedAt" },
  { key: "completed", label: "Completed", owner: "Medical Records", timeKey: "completedAt" },
];

// Who performs the next action from each status, and what that action is called.
const requestTransitions = {
  pending: { actor: "records", action: "Prepare" },
  reviewing: { actor: "records", action: "Prepare" },
  preparing: { actor: "records", action: "Mark Ready" },
  ready: { actor: "requester", action: "Confirm Receipt" },
  received: { actor: "requester", action: "Return Chart" },
  returned: { actor: "records", action: "Receive Return" },
  returnReceived: { actor: "records", action: "Complete" },
};

// Short orientation strip so users can see the full flow at a glance.
const flowGuide = ["Request", "Prepare", "Ready", "Pick Up", "Return", "Received", "Done"];

// Tells the signed-in user whether it is their turn and what happens next.
function turnHint(request, isRecordsUser) {
  if (request.status === "completed") return { text: "Transaction completed", tone: "done" };
  if (request.status === "canceled") return { text: "Request canceled", tone: "canceled" };
  const info = requestTransitions[request.status];
  if (!info) return null;
  const viewerIsActor = (info.actor === "records") === isRecordsUser;
  if (viewerIsActor) return { text: `Your turn — ${info.action}`, tone: "you" };
  return {
    text: info.actor === "records" ? "Waiting on Medical Records" : "Waiting on requester",
    tone: "waiting",
  };
}

const turnHintToneClass = {
  you: "border-green-200 bg-green-50 text-green-700",
  waiting: "border-amber-200 bg-amber-50 text-amber-700",
  done: "border-slate-200 bg-slate-50 text-slate-500",
  canceled: "border-red-200 bg-red-50 text-red-600",
};

function requesterDisplayName(request) {
  const name = request.requestedBy || "Unknown requester";
  if (request.requestedByRole === "doctor" && !name.toUpperCase().startsWith("DR.")) {
    return `DR. ${name}`;
  }
  return name;
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [transactionRequest, setTransactionRequest] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [modalChartSearch, setModalChartSearch] = useState("");

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
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
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
      { label: "Protected", value: scopedRequests.filter((request) => ["ready", "received", "returned"].includes(request.status)).length, icon: FileText },
      { label: "Returned", value: scopedRequests.filter((request) => request.status === "returned").length, icon: RotateCcw },
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

  const openRequestModal = () => {
    setForm(initialForm);
    setModalChartSearch("");
    setToast(null);
    setIsRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    if (isSaving) return;
    setIsRequestModalOpen(false);
    setModalChartSearch("");
  };

  const selectAvailableChart = (chart) => {
    setForm({
      ...initialForm,
      caseNumber: chart.caseNumber || "",
      patientName: chart.patientName || "",
    });
    setModalChartSearch("");
    setToast(null);
    setIsRequestModalOpen(true);
  };

  // Fills the request form from an available chart picked inside the modal search.
  const pickChartInModal = (chart) => {
    setForm((current) => ({
      ...current,
      caseNumber: chart.caseNumber || "",
      patientName: chart.patientName || "",
    }));
    setModalChartSearch(`${chart.patientName || ""} ${chart.caseNumber || ""}`.trim());
  };

  const modalChartMatches = useMemo(() => {
    const query = modalChartSearch.trim().toLowerCase();
    if (!query) return [];
    return charts
      .filter((chart) => chart.status === "available")
      .filter((chart) => [chart.caseNumber, chart.patientName, chart.patientDepartment, chart.attendingDoctorName]
        .some((value) => searchable(value).includes(query)))
      .slice(0, 6);
  }, [modalChartSearch, charts]);

  const submitRequest = async (event) => {
    event.preventDefault();
    const caseNumber = normalizeCaseNumber(form.caseNumber);
    const patientName = sanitizeText(form.patientName, { maxLength: 160, uppercase: true });
    const purpose = sanitizeText(form.purpose, { maxLength: 300 });

    if (!caseNumber || !patientName || !purpose) {
      setToast({ type: "error", message: "Enter the case number, patient name, and request purpose." });
      return;
    }

    try {
      setIsSaving(true);
      await addChartRequest({
        caseNumber,
        patientName,
        purpose,
        priority: form.priority,
        requestedBy: userProfile?.fullName || currentUser?.displayName || currentUser?.email || "",
        requestedByEmail: userProfile?.email || currentUser?.email || "",
        requestedByDepartment: userProfile?.department || "",
        requestedByClinic: userProfile?.clinic || "",
      });
      setForm(initialForm);
      setIsRequestModalOpen(false);
      setToast({
        type: "success",
        title: "Request Submitted",
        message: `${caseNumber} was sent to Medical Records to prepare.`,
        action: "Chart Request Submitted",
        audit: true,
        caseNumber,
        patientName,
        targetPath: `/chart-requests?search=${encodeURIComponent(caseNumber)}`,
      });
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
      ready: "readyAt",
      received: "receivedAt",
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

  const statusFilters = ["all", "pending", "preparing", "ready", "received", "returned", "returnReceived", "completed", "canceled"];

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
                ? "Review requests, prepare charts, and lock folders only when they are ready for pickup."
                : `Request physical charts for the ${roleLabel(userRole)} workspace and return them when done.`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="mr-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Flow</span>
              {flowGuide.map((step, index) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wide text-slate-500">{step}</span>
                  {index < flowGuide.length - 1 && <ArrowRight size={11} className="text-slate-300" />}
                </span>
              ))}
            </div>
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
            <div className="mrs-panel shrink-0 overflow-hidden rounded-xl">
              <div className="mrs-section-band flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">Available Charts</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Click a row to request it, or start a blank request.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mrs-status-badge mrs-status-success">{availableCharts.length} available</span>
                  <button
                    type="button"
                    onClick={openRequestModal}
                    className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                  >
                    <Send size={14} />
                    Request Chart
                  </button>
                </div>
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
                          role="button"
                          tabIndex={0}
                          onClick={() => selectAvailableChart(chart)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && selectAvailableChart(chart)}
                          aria-label={`Select chart for ${chart.patientName}, case ${chart.caseNumber}`}
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
                  {filter === "all" ? filter : statusLabel(filter)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mrs-panel min-h-0 flex-1 overflow-hidden rounded-xl">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-200">
                  <th className="w-[18%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                  <th className="w-[15%] p-3 text-[10px] font-black uppercase text-slate-400">Requester</th>
                  <th className="w-[16%] p-3 text-[10px] font-black uppercase text-slate-400">Unit / Physician</th>
                  <th className="w-[15%] p-3 text-[10px] font-black uppercase text-slate-400">Purpose</th>
                  <th className="w-[13%] p-3 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="w-[10%] p-3 text-[10px] font-black uppercase text-slate-400">Progress</th>
                  <th className="w-[13%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
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
                        {(() => {
                          const hint = turnHint(request, isRecordsUser);
                          // Skip the hint for finished rows — the badge already says it.
                          if (!hint || hint.tone === "done" || hint.tone === "canceled") return null;
                          return (
                            <span className={`mt-1.5 inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase leading-tight ${turnHintToneClass[hint.tone]}`}>
                              {hint.text}
                            </span>
                          );
                        })()}
                        {request.preparedBy && (
                          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">By {request.preparedBy}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setTransactionRequest(request)}
                          className="mrs-soft-button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                        >
                          <Eye size={14} />
                          Progress
                          {dateRows.length > 0 && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] text-green-800">{dateRows.length}</span>
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          {isRecordsUser ? (
                            <>
                              {(request.status === "pending" || request.status === "reviewing") && (
                                <button type="button" onClick={() => setRequestStatus(request, "preparing")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Prepare
                                </button>
                              )}
                              {request.status === "preparing" && (
                                <button type="button" onClick={() => setRequestStatus(request, "ready")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Ready
                                </button>
                              )}
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
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                              {["ready", "received", "completed", "canceled"].includes(request.status) && (
                                <span className="px-1 text-sm font-black text-slate-300" title="No action needed here">—</span>
                              )}
                            </>
                          ) : (
                            <>
                              {request.status === "ready" && (
                                <button type="button" onClick={() => setRequestStatus(request, "received")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Received
                                </button>
                              )}
                              {request.status === "received" && (
                                <button type="button" onClick={() => setRequestStatus(request, "returned")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Return
                                </button>
                              )}
                              {request.status === "pending" && (
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                              {!["pending", "ready", "received"].includes(request.status) && (
                                <span className="px-1 text-sm font-black text-slate-300" title="No action needed here">—</span>
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
          {(() => {
            const currentIndex = requestFlowSteps.findIndex((step) => step.key === transactionRequest.status);
            const isCompleted = transactionRequest.status === "completed";
            const isCanceled = transactionRequest.status === "canceled";
            const hint = turnHint(transactionRequest, isRecordsUser);
            const stepState = (step, index) => {
              if (transactionRequest[step.timeKey]) {
                return index === currentIndex && !isCompleted ? "current" : "done";
              }
              if (step.key === transactionRequest.status) return "current";
              return "upcoming";
            };

            return (
              <div role="dialog" aria-modal="true" aria-labelledby="transaction-dates-title" className="mrs-panel relative w-full max-w-lg overflow-hidden rounded-2xl">
                <div className="mrs-section-band flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Request Progress</p>
                    <p id="transaction-dates-title" className="mt-1 break-words text-lg font-black uppercase text-slate-900">{transactionRequest.patientName || "No patient name"}</p>
                    <p className="mt-1 font-mono text-xs font-black uppercase text-green-700">{transactionRequest.caseNumber}</p>
                    {hint && (
                      <span className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${turnHintToneClass[hint.tone]}`}>
                        {hint.text}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransactionRequest(null)}
                    className="mrs-soft-button inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
                    aria-label="Close request progress"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[65dvh] overflow-y-auto p-5">
                  <ol className="relative">
                    {requestFlowSteps.map((step, index) => {
                      const state = stepState(step, index);
                      const time = transactionRequest[step.timeKey];
                      const isLastNode = index === requestFlowSteps.length - 1 && !isCanceled;

                      return (
                        <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                          {!isLastNode && (
                            <span
                              aria-hidden="true"
                              className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${state === "done" ? "bg-green-300" : "bg-slate-200"}`}
                            />
                          )}
                          <span
                            className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${
                              state === "done"
                                ? "border-green-600 bg-green-600 text-white"
                                : state === "current"
                                  ? "border-green-600 bg-white text-green-700 ring-4 ring-green-100"
                                  : "border-slate-200 bg-white text-slate-300"
                            }`}
                          >
                            {state === "done" ? <CheckCircle2 size={16} /> : <span className="text-[11px] font-black">{index + 1}</span>}
                          </span>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className={`text-xs font-black uppercase ${state === "upcoming" ? "text-slate-400" : "text-slate-800"}`}>
                                {step.label}
                                {state === "current" && (
                                  <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] text-green-700">Current</span>
                                )}
                              </p>
                              {time && <p className="shrink-0 text-[10px] font-black uppercase text-slate-500">{formatDisplayDate(time)}</p>}
                            </div>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Handled by {step.owner}</p>
                          </div>
                        </li>
                      );
                    })}
                    {isCanceled && (
                      <li className="relative flex gap-3">
                        <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-red-300 bg-red-50 text-red-600">
                          <XCircle size={16} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black uppercase text-red-600">Canceled</p>
                            {transactionRequest.canceledAt && (
                              <p className="shrink-0 text-[10px] font-black uppercase text-slate-500">{formatDisplayDate(transactionRequest.canceledAt)}</p>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Request was canceled</p>
                        </div>
                      </li>
                    )}
                  </ol>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <ChartRequestConfirmModal
        action={confirmAction}
        isSaving={isSaving}
        onCancel={() => {
          if (!isSaving) setConfirmAction(null);
        }}
        onConfirm={confirmStatusUpdate}
      />

      {isRequestModalOpen && !isRecordsUser && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close chart request form"
            onClick={closeRequestModal}
          />
          <form onSubmit={submitRequest} className="mrs-panel relative w-full max-w-lg overflow-hidden rounded-2xl">
            <div className="mrs-section-band flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">New Chart Request</p>
                <h2 className="mt-1 text-lg font-black uppercase text-slate-900">Request A Chart</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Medical Records will prepare the chart and notify you when it is ready for pickup.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRequestModal}
                className="mrs-soft-button inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
                aria-label="Close chart request form"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Find Patient / Chart</span>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={modalChartSearch}
                    onChange={(event) => setModalChartSearch(event.target.value)}
                    placeholder="Search available chart by patient or case number"
                    className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
                  />
                </div>
                {modalChartSearch.trim() && modalChartMatches.length > 0 && (
                  <div className="mt-2 grid max-h-40 gap-1.5 overflow-y-auto">
                    {modalChartMatches.map((chart) => {
                      const isPicked = form.caseNumber === chart.caseNumber;
                      return (
                        <button
                          key={chart.caseNumber}
                          type="button"
                          onClick={() => pickChartInModal(chart)}
                          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                            isPicked
                              ? "border-green-500 bg-green-100 ring-2 ring-green-200"
                              : "border-slate-200 bg-white hover:border-green-300 hover:bg-green-50"
                          }`}
                        >
                          <p className="break-words text-xs font-black uppercase text-slate-800">{chart.patientName || "Unnamed patient"}</p>
                          <p className="mt-0.5 break-words text-[10px] font-bold uppercase text-slate-400">
                            {chart.caseNumber}{chart.patientDepartment ? ` · ${chart.patientDepartment}` : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {modalChartSearch.trim() && modalChartMatches.length === 0 && (
                  <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
                    No matching available chart found. You can still type the details below.
                  </p>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Case Number</span>
                <input
                  value={form.caseNumber}
                  onChange={(event) => updateForm("caseNumber", event.target.value.toUpperCase())}
                  placeholder="Case number"
                  className="mrs-field w-full rounded-lg px-3 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Name</span>
                <input
                  value={form.patientName}
                  onChange={(event) => updateForm("patientName", event.target.value)}
                  placeholder="Patient name"
                  className="mrs-field w-full rounded-lg px-3 py-2.5 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-2.5 text-sm font-black uppercase"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose / Remarks</span>
                <input
                  value={form.purpose}
                  onChange={(event) => updateForm("purpose", event.target.value)}
                  placeholder="Borrowing purpose / remarks"
                  className="mrs-field w-full rounded-lg px-3 py-2.5 text-sm font-bold"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                onClick={closeRequestModal}
                className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
              >
                {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                {isSaving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
