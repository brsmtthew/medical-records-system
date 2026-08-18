import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  LoaderCircle,
  Search,
  Send,
  X,
} from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import ChartTransactions from "./ChartTransactions";
import { addChartRequest, subscribeToCharts } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { isMedicalRecordsRole, roleLabel } from "@shared/constants/userRoles";
import { sanitizeText } from "@shared/utils/security";
import { normalizeCaseNumber, searchable } from "@shared/utils/recordSorting";

const initialForm = {
  caseNumber: "",
  patientName: "",
  purpose: "",
  priority: "routine",
};

// Short orientation strip so users can see the full flow at a glance.
const flowGuide = ["Request", "Prepare", "Ready", "Pick Up", "Review", "Return", "Received", "Done"];

// Clinical users browse available charts here and raise new requests; the resulting
// transactions live on the dedicated Transactions page.
function AvailableChartsRequests() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, userRole, currentUser } = useAuth();
  const [charts, setCharts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [chartSearchTerm, setChartSearchTerm] = useState("");
  const [modalChartSearch, setModalChartSearch] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Notifications and toasts deep-link with ?search=case; send those to the
  // Transactions page where the matching request actually lives.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("search")) {
      navigate(`/chart-transactions${location.search}`, { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const unsubscribeCharts = subscribeToCharts(
      setCharts,
      (error) => setToast({ type: "error", message: error.message || "Unable to load available charts from Firebase." }),
    );

    return () => unsubscribeCharts();
  }, []);

  // Show every chart so the list mirrors the patient registry; charts that are
  // currently checked out are kept visible but flagged as not requestable.
  const debouncedChartSearch = useDebouncedValue(chartSearchTerm);
  const chartRows = useMemo(() => {
    const query = debouncedChartSearch.trim().toLowerCase();
    return charts
      .filter((chart) => {
        if (!query) return true;
        return [
          chart.caseNumber,
          chart.patientName,
          chart.patientDepartment,
          chart.attendingDoctorName,
          chart.attendingDoctorClinic,
          chart.patientType,
        ].some((value) => searchable(value).includes(query));
      })
      .sort((a, b) => {
        // Available charts first, then alphabetical by patient name.
        const availableA = a.status === "available" ? 0 : 1;
        const availableB = b.status === "available" ? 0 : 1;
        if (availableA !== availableB) return availableA - availableB;
        return String(a.patientName || "").localeCompare(String(b.patientName || ""));
      });
  }, [debouncedChartSearch, charts]);

  const availableCount = useMemo(
    () => charts.filter((chart) => chart.status === "available").length,
    [charts],
  );

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
        targetPath: `/chart-transactions?search=${encodeURIComponent(caseNumber)}`,
      });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to send chart request." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-green-700">Version 3</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">
            Chart <span className="text-green-700">Requests</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {`Request physical charts for the ${roleLabel(userRole)} workspace, then track them on the Transactions page.`}
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

        <div className="mrs-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          <div className="mrs-section-band flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-slate-800">Available Charts</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Click a row to request it, or start a blank request.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mrs-status-badge mrs-status-success">{availableCount} available</span>
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
          <div className="flex min-h-0 flex-1 flex-col p-2">
            <div className="relative mb-2 shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={chartSearchTerm}
                onChange={(event) => setChartSearchTerm(event.target.value)}
                placeholder="Search available charts by case, patient, department, or physician"
                className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200">
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
                  {chartRows.map((chart) => {
                    const isAvailable = chart.status === "available";

                    return (
                      <tr
                        key={chart.caseNumber}
                        className={`mrs-table-row ${isAvailable ? "cursor-pointer" : "opacity-60"}`}
                        role={isAvailable ? "button" : undefined}
                        tabIndex={isAvailable ? 0 : undefined}
                        onClick={isAvailable ? () => selectAvailableChart(chart) : undefined}
                        onKeyDown={isAvailable ? (e) => (e.key === "Enter" || e.key === " ") && selectAvailableChart(chart) : undefined}
                        aria-label={isAvailable ? `Select chart for ${chart.patientName}, case ${chart.caseNumber}` : `${chart.patientName} chart is checked out`}
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
                          {isAvailable ? (
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
                          ) : (
                            <span className="mrs-status-badge mrs-status-info" title="This chart is currently checked out by an active request">
                              Checked Out
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {chartRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center">
                        <p className="font-black uppercase text-slate-700">No charts found</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Try another search or ask Medical Records to verify chart status.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <FloatingToast toast={toast} onClose={() => setToast(null)} />

      {isRequestModalOpen && (
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

export default function ChartRequests() {
  const { userRole } = useAuth();
  // Medical Records manage requests directly on the transactions table; clinical
  // users browse available charts here and view their transactions separately.
  if (isMedicalRecordsRole(userRole)) return <ChartTransactions />;
  return <AvailableChartsRequests />;
}
