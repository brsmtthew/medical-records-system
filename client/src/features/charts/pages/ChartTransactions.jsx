import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  RotateCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ChartRequestConfirmModal from "../modals/ChartRequestConfirmModal";
import { subscribeToChartRequests, updateChartRequest } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { searchable } from "@shared/utils/recordSorting";

const statusMeta = {
  pending: { label: "Pending", badge: "mrs-status-warning", icon: Clock },
  reviewing: { label: "Reviewing", badge: "mrs-status-info", icon: ClipboardList },
  preparing: { label: "Preparing", badge: "mrs-status-info", icon: FileText },
  ready: { label: "Ready", badge: "mrs-status-success", icon: CheckCircle2 },
  received: { label: "Picked Up", badge: "mrs-status-info", icon: ClipboardList },
  inReview: { label: "In Review", badge: "mrs-status-info", icon: ClipboardList },
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
  inReview: "Chart is being reviewed by the requester.",
  returned: "Chart was returned by the requester.",
  returnReceived: "Returned chart was received by Medical Records.",
  completed: "Chart request transaction completed.",
  canceled: "Chart request was canceled.",
};

// Ordered handoff steps so the whole request journey can be shown as a timeline.
const requestFlowSteps = [
  { key: "pending", label: "Requested", owner: "Requester", timeKey: "createdAt", byKey: "requestedBy" },
  { key: "preparing", label: "Preparing", owner: "Medical Records", timeKey: "preparedAt", byKey: "preparedBy" },
  { key: "ready", label: "Ready for Pickup", owner: "Medical Records", timeKey: "readyAt", byKey: "readyBy" },
  { key: "received", label: "Picked Up", owner: "Requester", timeKey: "receivedAt", byKey: "receivedBy" },
  { key: "inReview", label: "In Review", owner: "Requester", timeKey: "inReviewAt", byKey: "inReviewBy" },
  { key: "returned", label: "Returned", owner: "Requester", timeKey: "returnedAt", byKey: "returnedBy" },
  { key: "returnReceived", label: "Return Received", owner: "Medical Records", timeKey: "returnReceivedAt", byKey: "returnReceivedBy" },
  { key: "completed", label: "Completed", owner: "Medical Records", timeKey: "completedAt", byKey: "completedBy" },
];

// Who performs the next action from each status, and what that action is called.
const requestTransitions = {
  pending: { actor: "records", action: "Prepare" },
  reviewing: { actor: "records", action: "Prepare" },
  preparing: { actor: "records", action: "Mark Ready" },
  ready: { actor: "requester", action: "Confirm Receipt" },
  // Pickup puts the chart into review automatically; it stays with the requester
  // while reviewed, so the waiting side shows a neutral "in review" note instead of
  // an overdue-looking alert.
  received: { actor: "requester", action: "Return Chart", waiting: "Chart in review with requester", waitingTone: "review" },
  inReview: { actor: "requester", action: "Return Chart", waiting: "Chart in review with requester", waitingTone: "review" },
  returned: { actor: "records", action: "Receive Return" },
  returnReceived: { actor: "records", action: "Complete" },
};

// Short orientation strip so users can see the full flow at a glance.
const flowGuide = ["Request", "Prepare", "Ready", "Pick Up", "Review", "Return", "Received", "Done"];

// Tells the signed-in user whether it is their turn and what happens next.
function turnHint(request, isRecordsUser) {
  if (request.status === "completed") return { text: "Transaction completed", tone: "done" };
  if (request.status === "canceled") return { text: "Request canceled", tone: "canceled" };
  const info = requestTransitions[request.status];
  if (!info) return null;
  const viewerIsActor = (info.actor === "records") === isRecordsUser;
  if (viewerIsActor) return { text: `Your turn — ${info.action}`, tone: "you" };
  return {
    text: info.waiting || (info.actor === "records" ? "Waiting on Medical Records" : "Waiting on requester"),
    tone: info.waitingTone || "waiting",
  };
}

const turnHintToneClass = {
  you: "border-green-200 bg-green-50 text-green-700",
  waiting: "border-amber-200 bg-amber-50 text-amber-700",
  review: "border-blue-200 bg-blue-50 text-blue-700",
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
    ["In Review", request.inReviewAt, "mrs-status-text-reviewed"],
    ["Returned", request.returnedAt, "mrs-status-text-success"],
    ["Return Received", request.returnReceivedAt, "mrs-status-text-reviewed"],
    ["Completed", request.completedAt, "mrs-status-text-success"],
    ["Canceled", request.canceledAt, "mrs-status-text-warning"],
  ].filter(([, value]) => Boolean(value));
}

const statusFilters = ["all", "pending", "preparing", "ready", "received", "inReview", "returned", "returnReceived", "completed", "canceled"];

export default function ChartTransactions() {
  const location = useLocation();
  const { userProfile, userRole, currentUser } = useAuth();
  const isRecordsUser = isMedicalRecordsRole(userRole);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const debouncedSearch = useDebouncedValue(searchTerm);
  const visibleRequests = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
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
  }, [currentUser?.uid, isRecordsUser, requests, debouncedSearch, statusFilter]);

  const stats = useMemo(() => {
    const scopedRequests = isRecordsUser
      ? requests
      : requests.filter((request) => request.requestedById === currentUser?.uid);

    return [
      { label: "Active", value: scopedRequests.filter((request) => !["completed", "canceled"].includes(request.status)).length, icon: ClipboardList },
      { label: "Protected", value: scopedRequests.filter((request) => ["ready", "received", "inReview", "returned"].includes(request.status)).length, icon: FileText },
      { label: "Returned", value: scopedRequests.filter((request) => request.status === "returned").length, icon: RotateCcw },
    ];
  }, [currentUser?.uid, isRecordsUser, requests]);

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
      inReview: "inReviewAt",
      returned: "returnedAt",
      returnReceived: "returnReceivedAt",
      completed: "completedAt",
      canceled: "canceledAt",
    }[status];
    const byKey = {
      reviewing: "reviewedBy",
      preparing: "preparedBy",
      ready: "readyBy",
      received: "receivedBy",
      inReview: "inReviewBy",
      returned: "returnedBy",
      returnReceived: "returnReceivedBy",
      completed: "completedBy",
      canceled: "canceledBy",
    }[status];
    const actorName = userProfile?.fullName || currentUser?.displayName || currentUser?.email || "";
    // Pickup goes straight into review, so also stamp the "Picked Up" milestone
    // (receivedAt/receivedBy) that the timeline still shows for that moment.
    const isPickupReview = status === "inReview" && request.status === "ready";

    try {
      setIsSaving(true);
      await updateChartRequest(request.id, {
        status,
        remarks: statusRemarks[status] || "",
        ...(timeKey ? { [timeKey]: now } : {}),
        ...(byKey ? { [byKey]: actorName } : {}),
        ...(isPickupReview ? { receivedAt: now, receivedBy: actorName } : {}),
      });
      setToast({
        type: "success",
        title: "Request Updated",
        message: `${request.caseNumber} is now ${statusLabel(status)}.`,
        action: "Chart Request Updated",
        audit: true,
        caseNumber: request.caseNumber,
        patientName: request.patientName,
        targetPath: `${isRecordsUser ? "/chart-requests" : "/chart-transactions"}?search=${encodeURIComponent(request.caseNumber || "")}`,
      });
      setConfirmAction(null);
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to update this request." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,36rem)]">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-700">Version 3</p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">
              Chart <span className="text-green-700">Transactions</span>
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRecordsUser
                ? "Review requests, prepare charts, and lock folders only when they are ready for pickup."
                : "Track each chart request from pickup through review until it is returned."}
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
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mrs-field rounded-lg px-3 py-2 text-xs font-black uppercase lg:min-w-[12rem]"
              >
                {statusFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter === "all" ? "All Statuses" : statusLabel(filter)}
                  </option>
                ))}
              </select>
            </label>
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
                              {!["ready", "received", "inReview", "returned", "returnReceived", "completed", "canceled"].includes(request.status) && (
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                              {["ready", "received", "inReview", "completed", "canceled"].includes(request.status) && (
                                <span className="px-1 text-sm font-black text-slate-300" title="No action needed here">—</span>
                              )}
                            </>
                          ) : (
                            <>
                              {request.status === "ready" && (
                                <button type="button" onClick={() => setRequestStatus(request, "inReview")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Pick Up
                                </button>
                              )}
                              {["received", "inReview"].includes(request.status) && (
                                <button type="button" onClick={() => setRequestStatus(request, "returned")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Return
                                </button>
                              )}
                              {request.status === "pending" && (
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                              {!["pending", "ready", "received", "inReview"].includes(request.status) && (
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
            // When canceled, only show the steps that actually happened so the cancel
            // marker sits right after the last completed step instead of dangling
            // below steps that never occurred.
            const visibleSteps = isCanceled
              ? requestFlowSteps.filter((step) => transactionRequest[step.timeKey])
              : requestFlowSteps;

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
                    {visibleSteps.map((step, index) => {
                      const state = stepState(step, index);
                      const time = transactionRequest[step.timeKey];
                      const actor = transactionRequest[step.byKey];
                      const isLastNode = index === visibleSteps.length - 1 && !isCanceled;

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
                              {time && (
                                <div className="shrink-0 text-right">
                                  <p className="text-[10px] font-black uppercase text-slate-500">{formatDisplayDate(time)}</p>
                                  {actor && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{actor}</p>}
                                </div>
                              )}
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
    </DashboardLayout>
  );
}
