import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import PatientCaseCell from "../components/PatientCaseCell";
import {
  Check,
  Edit,
  Eye,
  FileCheck2,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  addTrackingRow,
  deleteTrackingRow,
  deleteTrackingRowType,
  markTrackingRowReviewed,
  releaseTrackingRow,
  subscribeToTrackingRows,
  updateTrackingRow,
} from "../services/trackingService";
import { subscribeToPatients } from "../services/patientService";
import { useAuth } from "../context/useAuth";
import {
  getTrackingColumns,
  releaseRelationshipOptions,
  statusBadgeClass,
} from "../utils/trackingConfigs";

function normalizeSearchValue(row, columns) {
  return columns.map((column) => column.value(row)).join(" ").toLowerCase();
}

function isReleased(row) {
  return row.releaseStatus === "released";
}

function isClosed(row) {
  return ["released", "voided", "canceled"].includes(row.releaseStatus);
}

function fieldValue(form, key) {
  return form[key] ?? "";
}

function isVitalConfig(config) {
  return config.collection === "vitalCertificateRequests";
}

function isMedicalDocumentConfig(config) {
  return config.collection === "medicalDocumentRequests";
}

function isLabResultConfig(config) {
  return config.collection === "labResultRequests";
}

function rowHasSelectedType(row, type) {
  return Array.isArray(row.typeList) && row.typeList.includes(type);
}

function rowMatchesSelectedType(config, row, type) {
  if (!config.typeOptions || !type) return true;
  if (rowHasSelectedType(row, type)) return true;
  if (config.typeFilterKey) return row[config.typeFilterKey] === type;
  return true;
}

function dateOnly(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function rowMatchesDateRange(row, startDate, endDate) {
  if (!startDate && !endDate) return true;

  const dates = ["requestedAt", "reviewedAt", "releasedAt"]
    .map((key) => dateOnly(row[key]))
    .filter(Boolean);

  return dates.some((date) => (
    (!startDate || date >= startDate) && (!endDate || date <= endDate)
  ));
}

function cellClassName(column) {
  const base = column.compact
    ? "p-3 align-top text-[10px] font-bold leading-tight text-slate-700 xl:p-4 xl:text-[11px]"
    : "p-3 align-top text-[11px] font-semibold leading-snug text-slate-700 xl:p-4 xl:text-xs";
  return column.wrap
    ? `${base} whitespace-pre-line break-words`
    : `${base} overflow-hidden text-ellipsis whitespace-nowrap`;
}

function indicatorClassName(tone = "neutral") {
  const classes = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return classes[tone] || classes.neutral;
}

function renderMultilineValue(value) {
  const lines = String(value || "N/A").split("\n").filter(Boolean);

  return (
    <div className="mrs-value-stack space-y-1 text-[10px] font-bold uppercase leading-tight xl:text-[11px]">
      {lines.map((line, index) => {
        const [label, ...rest] = line.split(":");
        const hasLabel = rest.length > 0;
        const colorClass = index === 0 ? "text-blue-700" : "text-green-700";

        return (
          <p key={`${line}-${index}`} className="whitespace-normal break-words text-slate-700">
            {hasLabel ? (
              <>
                <span className={`mrs-value-label ${colorClass}`}>{label.trim()}</span>
                <span className="mrs-value-main">{stackDateTimeText(rest.join(":").trim() || "N/A")}</span>
              </>
            ) : (
              <span className={colorClass}>{line}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

function stackDateTimeText(value) {
  return String(value || "N/A");
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
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

function renderCellValue(column, row) {
  const value = column.value(row);

  if (column.patientCase) {
    return <PatientCaseCell patientName={row.patientName} caseNumber={row.caseNumber} />;
  }
  if (column.dateRange) {
    const [firstValue = "N/A", secondValue = "N/A"] = String(value || "")
      .split("\n")
      .map((item) => item.replace(/^[^:]+:\s*/, ""));

    return (
      <div className="mrs-value-stack space-y-1 text-[10px] font-black uppercase leading-tight">
        <p className="break-words">
          <span className="mrs-value-label text-amber-700">{column.dateRange.firstLabel}</span>
          <span className="mrs-value-main">{stackDateTimeText(firstValue)}</span>
        </p>
        <p className="break-words">
          <span className="mrs-value-label text-green-700">{column.dateRange.secondLabel}</span>
          <span className="mrs-value-main">{stackDateTimeText(secondValue)}</span>
        </p>
      </div>
    );
  }
  if (column.dateLines) {
    const lines = String(value || "N/A").split("\n").filter(Boolean);

    return (
      <div className="mrs-value-stack space-y-1 text-[10px] font-black uppercase leading-tight">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className={`${index === 0 ? "text-amber-700" : "text-green-700"} whitespace-normal break-words`}>
            {line}
          </p>
        ))}
      </div>
    );
  }

  if (column.indicator) {
    return (
      <span className={`inline-flex max-w-full rounded-lg border px-2 py-1 text-[10px] font-black uppercase leading-tight whitespace-normal ${indicatorClassName(column.indicator)}`}>
        {value || "N/A"}
      </span>
    );
  }

  if (column.wrap && String(value || "").includes("\n")) {
    return renderMultilineValue(value);
  }

  if (!column.statusKey) return value;

  return (
    <span className={`mrs-status-badge ${statusBadgeClass(row[column.statusKey] || column.statusFallback)}`}>
      {value}
    </span>
  );
}

function PatientPicker({ form, patients, updateForm }) {
  const [patientSearch, setPatientSearch] = useState("");
  const matches = useMemo(() => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return [];
    return patients
      .filter((patient) => `${patient.name || ""} ${patient.caseNumber || ""} ${patient.department || ""}`.toLowerCase().includes(search))
      .slice(0, 3);
  }, [patientSearch, patients]);

  const choosePatient = (patient) => {
    updateForm("patientName", patient.name || "");
    updateForm("caseNumber", patient.caseNumber || patient.id || "");
    setPatientSearch(`${patient.name || ""} ${patient.caseNumber || ""}`.trim());
  };
  const selectedPatientKey = form.caseNumber || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        Find Patient
      </span>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={patientSearch}
          onChange={(event) => setPatientSearch(event.target.value)}
          placeholder="Search existing patient by name or case number"
          className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
        />
      </div>
      {patientSearch.trim() && matches.length > 0 && (
        <div className="mt-2 grid gap-2">
          {matches.map((patient) => (
            <button
              key={patient.id || patient.caseNumber}
              type="button"
              onClick={() => choosePatient(patient)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                selectedPatientKey && selectedPatientKey === (patient.caseNumber || patient.id)
                  ? "border-green-700 bg-green-100 ring-2 ring-green-200"
                  : "border-slate-200 bg-white hover:border-green-300 hover:bg-green-50"
              }`}
            >
              <p className="text-xs font-black text-slate-800">{patient.name || "Unnamed Patient"}</p>
              <p className="text-[10px] font-bold text-slate-400">{patient.caseNumber || "No case number"}</p>
            </button>
          ))}
        </div>
      )}
      {patientSearch.trim() && matches.length === 0 && (
        <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">
          No matching patient found.
        </p>
      )}
      <p className="mt-2 text-xs font-bold text-slate-500">
        Selected: <span className="text-slate-800">{form.patientName || "None"}</span>
        {form.caseNumber ? ` / ${form.caseNumber}` : ""}
      </p>
    </div>
  );
}

function TrackingFormModal({
  config,
  editingId,
  form,
  isOpen,
  onClose,
  onSubmit,
  patients,
  pendingAction,
  toggleType,
  updateForm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="mrs-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
          <div>
            <p className="text-lg font-black uppercase text-slate-800">
              {editingId ? `Edit ${config.singleLabel}` : `Add ${config.singleLabel}`}
            </p>
            <p className="text-xs font-semibold text-slate-500">{config.formHint}</p>
          </div>
          <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl p-2" aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {(editingId && config.editFields ? config.editFields : config.fields).map((field) => {
            if (field.showWhen && !field.showWhen(form)) return null;
            if (field.type === "patient") {
              return (
                <PatientPicker
                  key={field.key}
                  form={form}
                  patients={patients}
                  updateForm={updateForm}
                />
              );
            }

            return (
              <label key={field.key} className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {field.label}
                </span>
                {field.type === "select" ? (
                  <select
                    value={fieldValue(form, field.key)}
                    onChange={(event) => updateForm(field.key, event.target.value)}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === "multicheck" ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {field.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleType(option.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black uppercase ${
                          (form.typeList || []).includes(option.value)
                            ? "border-green-700 bg-green-700 text-white"
                            : "mrs-soft-button"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    min={field.min}
                    value={fieldValue(form, field.key)}
                    onChange={(event) => updateForm(field.key, event.target.value)}
                    disabled={field.key === "receivedBy" && form.receiverRelationship === "patient"}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  />
                )}
              </label>
            );
          })}

          {config.formSummary && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm font-black text-green-800">
              {config.formSummary(form)}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
            Cancel
          </button>
          <button
            type="submit"
            disabled={Boolean(pendingAction)}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {pendingAction ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
            {pendingAction ? "Saving..." : editingId ? "Save Changes" : "Add Record"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReleaseModal({ config, isOpen, item, onCancel, onConfirm, pendingAction }) {
  const [receivedBy, setReceivedBy] = useState("");
  const [receiverRelationship, setReceiverRelationship] = useState("representative");
  const [paymentStatus, setPaymentStatus] = useState(item?.paymentStatus || "unpaid");
  const [remarks, setRemarks] = useState("");

  if (!isOpen || !item) return null;
  const isVitalRelease = config.collection === "vitalCertificateRequests";
  const isManualReceiver = receiverRelationship === "others";
  const receiverName = receivedBy;
  const receiverOptions = isVitalRelease
    ? releaseRelationshipOptions
    : [
        { value: "patient", label: "Patient Itself" },
        ...releaseRelationshipOptions,
      ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mrs-panel w-full max-w-md rounded-2xl p-5">
        <p className="text-lg font-black uppercase text-slate-800">Release Record</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Mark {item.patientName || "this request"} as released.
        </p>
        {config.collection === "labResultRequests" && (
          <label className="mt-4 block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status</span>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        )}
        <label className="mt-4 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Relationship</span>
          <select
            value={receiverRelationship}
            onChange={(event) => setReceiverRelationship(event.target.value)}
            className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
          >
            {receiverOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Received By</span>
          <input
            value={receiverRelationship === "patient" ? item.patientName || "" : receiverName}
            onChange={(event) => setReceivedBy(event.target.value)}
            disabled={receiverRelationship === "patient"}
            placeholder={isManualReceiver ? "Enter receiver name" : "Enter receiver name"}
            className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            autoFocus
          />
        </label>
        {!isVitalRelease && (
          <label className="mt-3 block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Remarks
            </span>
            <input
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              receivedBy: receiverRelationship === "patient" ? item.patientName || "" : receiverName,
              receiverRelationship,
              paymentStatus,
              remarks: isVitalRelease ? "released" : remarks,
            })}
            disabled={pendingAction === "release"}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {pendingAction === "release" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            {pendingAction === "release" ? "Releasing..." : "Release"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({ confirmation, onCancel, pendingAction }) {
  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mrs-panel w-full max-w-md rounded-2xl p-5">
        <p className="text-lg font-black uppercase text-slate-800">{confirmation.title}</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">{confirmation.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmation.onConfirm}
            disabled={Boolean(pendingAction)}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {pendingAction && <LoaderCircle size={15} className="animate-spin" />}
            {pendingAction ? "Working..." : confirmation.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ isOpen, item, onCancel, onConfirm, pendingAction }) {
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewRelationship, setReviewRelationship] = useState("representative");

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mrs-panel w-full max-w-md rounded-2xl p-5">
        <p className="text-lg font-black uppercase text-slate-800">Mark Reviewed</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Enter the person who reviewed {item.patientName || "this certificate"}.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Relationship</span>
          <select
            value={reviewRelationship}
            onChange={(event) => setReviewRelationship(event.target.value)}
            className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
          >
            {releaseRelationshipOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Reviewed By</span>
          <input
            value={reviewedBy}
            onChange={(event) => setReviewedBy(event.target.value)}
            className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            autoFocus
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ reviewedBy, reviewRelationship })}
            disabled={pendingAction === "review"}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {pendingAction === "review" ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
            {pendingAction === "review" ? "Saving..." : "Mark Reviewed"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordViewModal({ columns, config, isOpen, item, onClose }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mrs-panel flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
          <div>
            <p className="text-lg font-black uppercase text-slate-800">View Released Record</p>
            <p className="text-xs font-semibold text-slate-500">
              Check the released {config.singleLabel.toLowerCase()} encoding.
            </p>
          </div>
          <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl p-2" aria-label="Close view">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.label} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{column.label}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm font-black text-slate-800">
                  {column.value(item)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 p-4">
          <button type="button" onClick={onClose} className="mrs-primary-button rounded-xl px-4 py-3 text-xs font-black uppercase">
            Done Checking
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage({ config }) {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(config.defaultForm);
  const [editingId, setEditingId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [releaseItem, setReleaseItem] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState(config.typeOptions?.[0]?.value || "");
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const activeColumns = getTrackingColumns(config, selectedType);

  useEffect(() => {
    return subscribeToTrackingRows(
      config.collection,
      setRows,
      (error) => setLoadError(error.message || `Unable to load ${config.pluralLabel.toLowerCase()}.`),
    );
  }, [config.collection, config.pluralLabel]);

  useEffect(() => {
    return subscribeToPatients(
      setPatients,
      (error) => setLoadError(error.message || "Unable to load patients for selection."),
    );
  }, []);

  const activeRows = useMemo(
    () => rows.filter((row) => !["voided", "canceled"].includes(row.releaseStatus)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return activeRows.filter((row) => {
      const matchesSearch = !search || normalizeSearchValue(row, activeColumns).includes(search);
      const matchesStatus = statusFilter === "all" || (
        config.matchesStatus
          ? config.matchesStatus(row, statusFilter)
          : config.statusValue(row) === statusFilter
      );
      const matchesDate = rowMatchesDateRange(row, startDate, endDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [activeColumns, activeRows, config, endDate, searchTerm, startDate, statusFilter]);
  const displayedRows = config.typeOptions
    ? filteredRows.filter((row) => rowMatchesSelectedType(config, row, selectedType))
    : filteredRows;

  const stats = config.stats(activeRows);
  const visibleTypes = config.typeOptions?.filter((type) => type.value === selectedType) || [{ value: "all", label: "" }];

  const resetForm = () => {
    setForm(config.defaultForm);
    setEditingId("");
    setIsFormOpen(false);
  };

  const updateForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "receiverRelationship" && value === "patient") {
        next.receivedBy = current.patientName || "";
      }
      if (key === "patientName" && current.receiverRelationship === "patient") {
        next.receivedBy = value;
      }
      return config.normalizeForm ? config.normalizeForm(next) : next;
    });
  };

  const toggleType = (type) => {
    setForm((current) => {
      const currentTypes = Array.isArray(current.typeList) ? current.typeList : [];
      const typeList = currentTypes.includes(type)
        ? currentTypes.filter((item) => item !== type)
        : [...currentTypes, type];
      return { ...current, typeList };
    });
  };

  const openCreateForm = () => {
    const typedForm = isVitalConfig(config)
      ? { ...config.defaultForm, typeList: [selectedType] }
      : isMedicalDocumentConfig(config)
        ? { ...config.defaultForm, documentType: selectedType, typeList: [selectedType] }
        : config.defaultForm;
    setForm(typedForm);
    setEditingId("");
    setIsFormOpen(true);
  };

  const saveForm = async () => {
    try {
      setPendingAction(editingId ? "update" : "create");
      if (editingId) {
        await updateTrackingRow(config.collection, editingId, form);
        setSuccessMessage(`${config.singleLabel} was updated.`);
      } else {
        const selectedTypes = Array.isArray(form.typeList) && form.typeList.length ? form.typeList : [form.documentType].filter(Boolean);
        const rowsToAdd = ["medicalDocumentRequests", "vitalCertificateRequests"].includes(config.collection)
          ? selectedTypes.map((type) => ({
              ...form,
              documentType: isMedicalDocumentConfig(config) ? type : form.documentType || "",
              typeList: [type],
              reviewStatus: isVitalConfig(config) ? "forReview" : form.reviewStatus || "",
              releaseStatus: "forRelease",
              reviewedAt: "",
              releasedAt: "",
              receivedBy: "",
              receiverRelationship: "",
              remarks: "",
            }))
          : [{
              ...form,
              releaseStatus: "forRelease",
              releasedAt: "",
              receivedBy: "",
              receiverRelationship: "",
              remarks: "",
            }];
        await Promise.all(rowsToAdd.map((row) => addTrackingRow(config.collection, row)));
        setSuccessMessage(`${config.singleLabel} was recorded for release.`);
      }
      setLoadError("");
      setConfirmation(null);
      resetForm();
    } catch (error) {
      setLoadError(error.message || `Unable to save ${config.singleLabel.toLowerCase()}.`);
    } finally {
      setPendingAction("");
    }
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const validationMessage = config.validate(form);
    if (validationMessage) {
      setLoadError(validationMessage);
      return;
    }

    setConfirmation({
      title: editingId ? "Save Changes" : "Add Record",
      message: editingId ? "Save these changes to this record?" : "Add this new record?",
      confirmLabel: editingId ? "Save" : "Add",
      onConfirm: saveForm,
    });
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm(config.toForm(row));
    setIsFormOpen(true);
  };

  const handleReviewed = async (payload) => {
    if (!reviewItem) return;
    if (!payload.reviewRelationship) {
      setLoadError("Choose the reviewer relationship.");
      return;
    }
    if (!payload.reviewedBy.trim()) {
      setLoadError("Enter the person who reviewed the certificate.");
      return;
    }
    try {
      setPendingAction("review");
      await markTrackingRowReviewed(config.collection, reviewItem.id, { ...payload, type: selectedType });
      setSuccessMessage(`${config.singleLabel} was marked reviewed.`);
      setConfirmation(null);
      setReviewItem(null);
    } catch (error) {
      setLoadError(error.message || "Unable to mark record reviewed.");
    } finally {
      setPendingAction("");
    }
  };

  const confirmReviewed = (payload) => {
    if (!reviewItem) return;
    if (!payload.reviewRelationship) {
      setLoadError("Choose the reviewer relationship.");
      return;
    }
    if (!payload.reviewedBy.trim()) {
      setLoadError("Enter the person who reviewed the certificate.");
      return;
    }
    setConfirmation({
      title: "Mark Reviewed",
      message: "Mark this certificate as reviewed?",
      confirmLabel: "Mark Reviewed",
      onConfirm: () => handleReviewed(payload),
    });
  };

  const handleRelease = async (payload) => {
    if (!releaseItem) return;
    if (!payload.receivedBy.trim()) {
      setLoadError("Enter who received the released document.");
      return;
    }
    if (config.collection !== "vitalCertificateRequests" && !payload.remarks.trim()) {
      setLoadError("Enter release remarks.");
      return;
    }
    if (isLabResultConfig(config) && payload.paymentStatus !== "paid") {
      setLoadError("Lab result must be marked paid before release.");
      return;
    }

    try {
      setPendingAction("release");
      await releaseTrackingRow(config.collection, releaseItem.id, { ...payload, type: selectedType });
      setSuccessMessage(`${config.singleLabel} was released.`);
      setConfirmation(null);
      setReleaseItem(null);
    } catch (error) {
      setLoadError(error.message || "Unable to release record.");
    } finally {
      setPendingAction("");
    }
  };

  const confirmRelease = (payload) => {
    if (!releaseItem) return;
    if (!payload.receivedBy.trim()) {
      setLoadError("Enter who received the released document.");
      return;
    }
    if (config.collection !== "vitalCertificateRequests" && !payload.remarks.trim()) {
      setLoadError("Enter release remarks.");
      return;
    }
    if (isLabResultConfig(config) && payload.paymentStatus !== "paid") {
      setLoadError("Set payment status to paid before release.");
      return;
    }
    setConfirmation({
      title: "Release Record",
      message: "Release this record now?",
      confirmLabel: "Release",
      onConfirm: () => handleRelease(payload),
    });
  };

  const deleteRow = async (row) => {
    if (!isAdmin) {
      setLoadError("Only admins can delete tracking records.");
      return;
    }
    try {
      setPendingAction(`delete-${row.id}`);
      if (isMedicalDocumentConfig(config) && Array.isArray(row.typeList) && row.typeList.length > 1) {
        await deleteTrackingRowType(config.collection, row.id, selectedType);
        setSuccessMessage(`${config.singleLabel} type was deleted.`);
      } else if (isVitalConfig(config) && Array.isArray(row.typeList) && row.typeList.length > 1) {
        await deleteTrackingRowType(config.collection, row.id, selectedType);
        setSuccessMessage(`${config.singleLabel} type was deleted.`);
      } else {
        await deleteTrackingRow(config.collection, row.id);
        setSuccessMessage(`${config.singleLabel} was deleted.`);
      }
      setConfirmation(null);
    } catch (error) {
      setLoadError(error.message || `Unable to delete ${config.singleLabel.toLowerCase()}.`);
    } finally {
      setPendingAction("");
    }
  };

  const confirmDeleteRow = (row) => {
    if (!isAdmin) {
      setLoadError("Only admins can delete tracking records.");
      return;
    }
    const deleteMessage = ["medicalDocumentRequests", "vitalCertificateRequests"].includes(config.collection) && Array.isArray(row.typeList) && row.typeList.length > 1
      ? `Delete only the ${selectedType} type from this record? Other selected types will stay.`
      : `Delete this ${config.singleLabel.toLowerCase()}?`;
    setConfirmation({
      title: "Delete Record",
      message: deleteMessage,
      confirmLabel: "Delete",
      onConfirm: () => deleteRow(row),
    });
  };

  const resetFilters = () => {
    if (!searchTerm && statusFilter === "all" && !startDate && !endDate) {
      setInfoMessage("No filters to reset.");
      return;
    }
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setInfoMessage("Filters were reset.");
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              {config.titlePrefix} <span className="text-green-700">{config.titleAccent}</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">{config.description}</p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
          >
            <Plus size={17} />
            Add Record
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {stats.map((item) => (
            <div key={item.label} className="mrs-dashboard-stat mrs-surface rounded-xl p-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mrs-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          <div className="shrink-0 space-y-3 border-b border-slate-100 bg-slate-50 p-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
              <FilterField label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
                  />
                </div>
              </FilterField>
              <FilterField label="Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-xs font-black uppercase"
                >
                  <option value="all">All Status</option>
                  {config.statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FilterField>
              <button
                type="button"
                onClick={resetFilters}
                className="mrs-soft-button mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
            {config.typeOptions && (
              <div className="flex flex-wrap gap-2">
                {config.typeOptions.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition-colors ${
                      selectedType === type.value
                        ? "border-green-700 bg-green-700 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:text-green-700"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
            <StatusLegend options={config.statusOptions} />
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            {visibleTypes.map((type) => {
              const tableRows = config.typeOptions ? displayedRows : filteredRows;

              return (
                <div key={type.value} className={config.typeOptions ? "border-b border-slate-100 last:border-b-0" : ""}>
                  {config.typeOptions && (
                    <div className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3">
                      <p className="text-sm font-black uppercase text-slate-800">{type.label} {config.typeHeadingSuffix || "Records"}</p>
                      <p className="text-xs font-bold text-slate-400">{tableRows.length} record(s)</p>
                    </div>
                  )}
                  <table className="w-full min-w-[980px] table-fixed text-left">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-slate-100">
                        {activeColumns.map((column) => (
                          <th key={column.label} className={`${column.width || "w-[14%]"} whitespace-normal p-3 align-top text-[9px] font-black uppercase leading-tight tracking-widest text-slate-400 xl:p-4 xl:text-[10px]`}>
                            {column.label}
                          </th>
                        ))}
                        <th className="w-[11%] p-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 xl:text-[10px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableRows.map((row) => (
                        <tr key={`${type.value}-${row.id}`} className="mrs-table-row">
                          {activeColumns.map((column) => (
                            <td
                              key={column.label}
                              title={String(column.value(row) || "")}
                              className={cellClassName(column)}
                            >
                              {column.render ? column.render(row) : renderCellValue(column, row)}
                            </td>
                          ))}
                          <td className="p-3 align-top xl:p-4">
                            <div className="flex justify-end gap-2">
                              {isVitalConfig(config) && row.reviewStatus !== "reviewed" && (
                                <button
                                  type="button"
                                  onClick={() => setReviewItem(row)}
                                  disabled={pendingAction === "review"}
                                  className="rounded-xl border border-blue-100 p-2 text-blue-600 hover:border-blue-300 disabled:opacity-60"
                                  aria-label={`Mark ${config.singleLabel} reviewed`}
                                  title="Mark reviewed"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              {!isClosed(row) && (
                                <button
                                  type="button"
                                  onClick={() => setReleaseItem(row)}
                                  className={`rounded-xl border border-green-100 p-2 text-green-600 hover:border-green-300 ${
                                    isVitalConfig(config) && row.reviewStatus !== "reviewed" ? "hidden" : ""
                                  }`}
                                  aria-label={`Release ${config.singleLabel}`}
                                  title="Release"
                                >
                                  <Send size={16} />
                                </button>
                              )}
                              {isReleased(row) && (
                                <button
                                  type="button"
                                  onClick={() => setViewItem(row)}
                                  className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                                  aria-label={`View ${config.singleLabel}`}
                                  title="View released record"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                aria-label={`Edit ${config.singleLabel}`}
                              >
                                <Edit size={16} />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteRow(row)}
                                  disabled={pendingAction === `delete-${row.id}`}
                                  className="rounded-xl border border-red-100 p-2 text-red-500 hover:border-red-300 disabled:opacity-60"
                                  aria-label={`Delete ${config.singleLabel}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {tableRows.length === 0 && (
                        <tr>
                          <td colSpan={activeColumns.length + 1} className="p-10 text-center">
                            <FileCheck2 size={38} className="mx-auto mb-3 text-slate-300" />
                            <p className="font-black uppercase text-slate-700">No Records Found</p>
                            <p className="mt-1 text-sm font-semibold text-slate-400">
                              Add a record or adjust the filters.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-500">
            Showing {displayedRows.length} of {activeRows.length} {config.pluralLabel.toLowerCase()}.
          </div>
        </div>
      </div>

      <TrackingFormModal
        config={config}
        editingId={editingId}
        form={form}
        isOpen={isFormOpen}
        onClose={resetForm}
        onSubmit={submitForm}
        patients={patients}
        pendingAction={pendingAction}
        toggleType={toggleType}
        updateForm={updateForm}
      />
      <ReleaseModal
        key={releaseItem?.id || "release-closed"}
        config={config}
        isOpen={Boolean(releaseItem)}
        item={releaseItem}
        onCancel={() => setReleaseItem(null)}
        onConfirm={confirmRelease}
        pendingAction={pendingAction}
      />
      <ReviewModal
        key={reviewItem?.id || "review-closed"}
        isOpen={Boolean(reviewItem)}
        item={reviewItem}
        onCancel={() => setReviewItem(null)}
        onConfirm={confirmReviewed}
        pendingAction={pendingAction}
      />
      <RecordViewModal
        columns={activeColumns}
        config={config}
        isOpen={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />
      <ConfirmationModal
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
        pendingAction={pendingAction}
      />
      <FloatingToast
        toast={
          loadError
            ? { type: "error", message: loadError }
            : infoMessage
              ? { type: "info", message: infoMessage }
              : successMessage
                ? { type: "success", title: config.singleLabel, message: successMessage, audit: true, action: `${config.singleLabel} Updated` }
                : null
        }
        onClose={() => {
          setLoadError("");
          setInfoMessage("");
          setSuccessMessage("");
        }}
      />
    </DashboardLayout>
  );
}
