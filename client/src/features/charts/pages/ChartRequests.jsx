import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Search,
  Send,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import { addChartRequest, subscribeToChartRequests, subscribeToCharts, updateChartRequest } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole, roleLabel } from "@shared/constants/userRoles";
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
  preparing: { label: "Preparing", badge: "mrs-status-info", icon: FileText },
  ready: { label: "Ready", badge: "mrs-status-success", icon: CheckCircle2 },
  completed: { label: "Completed", badge: "mrs-status-success", icon: CheckCircle2 },
  canceled: { label: "Canceled", badge: "mrs-status-danger", icon: XCircle },
};

function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

function searchable(value) {
  return String(value || "").toLowerCase();
}

function requesterDisplayName(request) {
  const name = request.requestedBy || "Unknown requester";
  if (request.requestedByRole === "doctor" && !name.toUpperCase().startsWith("DR.")) {
    return `DR. ${name}`;
  }
  return name;
}

export default function ChartRequests() {
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
      { label: "Ready", value: scopedRequests.filter((request) => request.status === "ready").length, icon: CheckCircle2 },
      { label: "Completed", value: scopedRequests.filter((request) => request.status === "completed").length, icon: Clock },
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const caseNumber = normalizeCaseNumber(form.caseNumber);
    const patientName = sanitizeText(form.patientName, { maxLength: 160, uppercase: true });
    const purpose = sanitizeText(form.purpose, { maxLength: 300 });

    if (!caseNumber || !patientName || !purpose) {
      setToast({ type: "error", message: "Enter the case number, patient name, and request purpose." });
      return;
    }
    if (!window.confirm(`Send chart request for ${caseNumber} to Medical Records?`)) {
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
      setToast({
        type: "success",
        title: "Chart Request Sent",
        message: `${caseNumber} was sent to Medical Records.`,
        action: "Chart Request Created",
        audit: true,
        caseNumber,
        patientName,
      });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to send chart request." });
    } finally {
      setIsSaving(false);
    }
  };

  const setRequestStatus = async (request, status) => {
    if (!window.confirm(`Mark ${request.caseNumber} as ${status}?`)) {
      return;
    }

    const now = new Date().toISOString();
    const timeKey = {
      preparing: "preparedAt",
      ready: "readyAt",
      completed: "completedAt",
      canceled: "canceledAt",
    }[status];

    try {
      await updateChartRequest(request.id, {
        status,
        ...(timeKey ? { [timeKey]: now } : {}),
      });
      setToast({
        type: "success",
        title: "Request Updated",
        message: `${request.caseNumber} is now ${status}.`,
        action: "Chart Request Updated",
        audit: true,
        caseNumber: request.caseNumber,
        patientName: request.patientName,
      });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to update this request." });
    }
  };

  const statusFilters = ["active", "all", "pending", "preparing", "ready", "completed", "canceled"];

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
                ? "Prepare and close clinical requests before physical chart pickup."
                : `Send chart requests to Medical Records from the ${roleLabel(userRole)} workspace.`}
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
            <form onSubmit={handleSubmit} className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-3">
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
                  placeholder="Purpose / remarks"
                  className="mrs-field rounded-lg px-3 py-2 text-xs font-bold"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase disabled:opacity-60"
                >
                  <Send size={16} />
                  {isSaving ? "Sending" : "Send"}
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
                    placeholder="Search available charts by case, patient, or department"
                    className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
                  />
                </div>
                <div className="max-h-52 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[680px] table-fixed text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="mrs-section-band border-b border-slate-200">
                        <th className="w-[45%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                        <th className="w-[25%] p-3 text-[10px] font-black uppercase text-slate-400">Department</th>
                        <th className="w-[15%] p-3 text-[10px] font-black uppercase text-slate-400">Type</th>
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
                          <td colSpan="4" className="p-6 text-center">
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
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mrs-panel min-h-0 flex-1 overflow-hidden rounded-xl">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[980px] table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-200">
                  <th className="w-[25%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                  <th className="w-[22%] p-3 text-[10px] font-black uppercase text-slate-400">Requester</th>
                  <th className="w-[21%] p-3 text-[10px] font-black uppercase text-slate-400">Purpose</th>
                  <th className="w-[14%] p-3 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="w-[18%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((request) => {
                  const meta = statusMeta[request.status] || statusMeta.pending;
                  const StatusIcon = meta.icon;
                  const requesterUnit = request.requestedByClinic || request.requestedByDepartment || "No assignment";

                  return (
                    <tr key={request.id} className="mrs-table-row">
                      <td className="p-3">
                        <PatientCaseCell patientName={request.patientName} caseNumber={request.caseNumber} />
                        <p className="mt-1 text-[10px] font-black uppercase text-slate-400">
                          Requested {formatDisplayDate(request.createdAt)}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="break-words text-xs font-black uppercase text-slate-800">{requesterDisplayName(request)}</p>
                        <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">{requesterUnit}</p>
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
                        {request.preparedBy && (
                          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">By {request.preparedBy}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          {isRecordsUser ? (
                            <>
                              {request.status === "pending" && (
                                <button type="button" onClick={() => setRequestStatus(request, "preparing")} className="mrs-soft-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Prepare
                                </button>
                              )}
                              {["pending", "preparing"].includes(request.status) && (
                                <button type="button" onClick={() => setRequestStatus(request, "ready")} className="mrs-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Ready
                                </button>
                              )}
                              {request.status === "ready" && (
                                <button type="button" onClick={() => setRequestStatus(request, "completed")} className="mrs-blue-button rounded-lg px-2.5 py-2 text-[10px] font-black uppercase">
                                  Complete
                                </button>
                              )}
                              {!["completed", "canceled"].includes(request.status) && (
                                <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                                  Cancel
                                </button>
                              )}
                            </>
                          ) : request.status === "pending" ? (
                            <button type="button" onClick={() => setRequestStatus(request, "canceled")} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-black uppercase text-red-600">
                              Cancel
                            </button>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-slate-400">No action</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No chart requests found</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        {isRecordsUser ? "New clinical requests will appear here." : "Send a request when a physical chart is needed."}
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
    </DashboardLayout>
  );
}
