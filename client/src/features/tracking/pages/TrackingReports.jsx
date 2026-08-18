import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import { FileText, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  deleteTrackingRow,
  deleteTrackingRowType,
  subscribeToTrackingRows,
} from "@features/tracking/services/trackingService";
import {
  optionLabel,
  relationshipOptions,
  releaseStatuses,
  statusBadgeClass,
  trackingReportConfigs,
} from "@features/tracking/utils/trackingConfigs";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { recordTimeValue } from "@shared/utils/recordSorting";
import { useAuth } from "@features/auth/context/useAuth";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";

function reportSearchValue(row, columns) {
  return columns.map((column) => column.value(row)).join(" ").toLowerCase();
}

function rowHasSelectedType(row, type) {
  return Array.isArray(row.typeList) && row.typeList.includes(type);
}

function rowMatchesSelectedType(config, row, type) {
  if (!config.typeOptions || !type) return true;
  // Rows carrying an explicit typeList must include the selected type; otherwise
  // a multi-type record would appear under every type tab as duplicate rows.
  if (Array.isArray(row.typeList) && row.typeList.length) return rowHasSelectedType(row, type);
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

function formatReportDateTime(value) {
  const time = recordTimeValue(value);
  return time ? formatDisplayDate(time) : "N/A";
}

function receiverLabel(row) {
  const receiver = row.receivedBy || "N/A";
  const relationship = optionLabel(relationshipOptions, row.receiverRelationship);
  return row.receiverRelationship ? `${receiver}\n${relationship}` : receiver;
}

function statusLabel(row) {
  if (row.releaseStatus === "canceled") return "Canceled";
  return optionLabel(releaseStatuses, row.releaseStatus || "forRelease");
}

function statusBadge(row) {
  const status = row.releaseStatus || "forRelease";

  return (
    <span className={`mrs-status-badge ${statusBadgeClass(status)}`}>
      {statusLabel(row)}
    </span>
  );
}

function getMedicalReportColumns() {
  return [
    {
      label: "Patient / Case",
      width: "w-[22%]",
      wrap: true,
      patientCase: true,
      value: (row) => `${row.patientName || "N/A"}\n${row.caseNumber || "N/A"}`,
    },
    {
      label: "Status",
      width: "w-[13%]",
      wrap: true,
      value: statusLabel,
      render: statusBadge,
    },
    {
      label: "Date Requested",
      width: "w-[14%]",
      wrap: true,
      value: (row) => formatReportDateTime(row.requestedAt),
    },
    {
      label: "Date Released",
      width: "w-[14%]",
      wrap: true,
      value: (row) => formatReportDateTime(row.releasedAt),
    },
    {
      label: "Received By / Relationship",
      width: "w-[18%]",
      wrap: true,
      value: receiverLabel,
    },
    {
      label: "Remarks",
      width: "w-[19%]",
      wrap: true,
      value: (row) => row.remarks || "",
    },
  ];
}

function reportStatusOptions(config) {
  const hasCanceled = config.statusOptions.some((option) => option.value === "canceled");
  return hasCanceled
    ? config.statusOptions
    : [...config.statusOptions, { value: "canceled", label: "Canceled" }];
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
  if (column.statusKey) {
    return (
      <span className={`mrs-status-badge ${statusBadgeClass(row[column.statusKey] || column.statusFallback)}`}>
        {value}
      </span>
    );
  }

  return value;
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
            className="mrs-primary-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {pendingAction ? "Working..." : confirmation.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrackingReports() {
  const { isAdmin } = useAuth();
  const [activeCollection, setActiveCollection] = useState(trackingReportConfigs[0].collection);
  const [rowsByCollection, setRowsByCollection] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState(trackingReportConfigs[0].typeOptions?.[0]?.value || "");
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [successMeta, setSuccessMeta] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const activeConfig = trackingReportConfigs.find((config) => config.collection === activeCollection) || trackingReportConfigs[0];
  const activeColumns = useMemo(() => getMedicalReportColumns(), []);
  const rows = useMemo(
    () => (rowsByCollection[activeConfig.collection] || []).filter((row) => !row.deleted && row.releaseStatus !== "voided"),
    [activeConfig.collection, rowsByCollection],
  );

  useEffect(() => {
    const unsubscribers = trackingReportConfigs.map((config) => (
      subscribeToTrackingRows(
        config.collection,
        (nextRows) => setRowsByCollection((current) => ({ ...current, [config.collection]: nextRows })),
        (error) => setLoadError(error.message || "Unable to load tracking reports."),
      )
    ));

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const filteredRows = useMemo(() => {
    const search = debouncedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      // Soft-deleted rows (and legacy voided rows) are preserved only in Print Reports.
      if (row.deleted || row.releaseStatus === "voided") return false;
      const matchesSearch = !search || reportSearchValue(row, activeColumns).includes(search);
      const matchesStatus = statusFilter === "all" || (
        activeConfig.matchesStatus
          ? activeConfig.matchesStatus(row, statusFilter)
          : activeConfig.statusValue(row) === statusFilter
      );
      const matchesDate = rowMatchesDateRange(row, startDate, endDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [activeColumns, activeConfig, endDate, rows, debouncedSearch, startDate, statusFilter]);
  const displayedRows = activeConfig.typeOptions
    ? filteredRows.filter((row) => rowMatchesSelectedType(activeConfig, row, selectedType))
    : filteredRows;
  const activeStats = activeConfig.stats(displayedRows);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const deleteRow = async (row) => {
    if (!isAdmin) {
      setLoadError("Only admins can delete report records.");
      return;
    }

    try {
      setPendingAction(`delete-${row.id}`);
      if (["medicalDocumentRequests", "vitalCertificateRequests"].includes(activeConfig.collection) && Array.isArray(row.typeList) && row.typeList.length > 1) {
        await deleteTrackingRowType(activeConfig.collection, row.id, selectedType);
      } else {
        await deleteTrackingRow(activeConfig.collection, row.id, `${activeConfig.pluralLabel} Report`);
      }
      setSuccessMessage("Report record was deleted. It stays in Print Reports for audit.");
      setSuccessMeta({
        action: "Medical Record Deleted",
        patientName: row.patientName || "",
        caseNumber: row.caseNumber || "",
        audit: true,
        adminOnly: true,
        targetPath: "/tracking-reports",
      });
      setConfirmation(null);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Unable to delete report record.");
    } finally {
      setPendingAction("");
    }
  };

  const confirmDeleteRow = (row) => {
    if (!isAdmin) {
      setLoadError("Only admins can delete report records.");
      return;
    }

    const deleteMessage = ["medicalDocumentRequests", "vitalCertificateRequests"].includes(activeConfig.collection) && Array.isArray(row.typeList) && row.typeList.length > 1
      ? `Delete only the ${selectedType} type from this report record? Other selected types will stay.`
      : "Delete this report record?";
    setConfirmation({
      title: "Delete Report Record",
      message: deleteMessage,
      confirmLabel: "Delete",
      onConfirm: () => deleteRow(row),
    });
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="no-print grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              Medical <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Preview medical document, laboratory result, and civil document reports.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-1.5 xl:justify-self-end xl:w-[min(42rem,100%)]">
            {trackingReportConfigs.map((config) => (
              <button
                key={config.collection}
                type="button"
                onClick={() => {
                  setActiveCollection(config.collection);
                  setSearchTerm("");
                  setStatusFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setSelectedType(config.typeOptions?.[0]?.value || "");
                }}
                aria-pressed={activeConfig.collection === config.collection}
                className={`mrs-clickable-card mrs-dashboard-stat-fill rounded-xl border p-2 text-left ${
                  activeConfig.collection === config.collection
                    ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                    : "mrs-surface"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.pluralLabel}</p>
                <p className="mt-0.5 text-base font-black leading-none text-slate-800">{(rowsByCollection[config.collection] || []).filter((row) => !row.deleted && row.releaseStatus !== "voided").length}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mrs-panel mrs-print-area flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          <div className="mrs-report-header grid shrink-0 gap-3 border-b border-slate-100 bg-white p-3 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-700">TGMCI Medical Records</p>
              <div className="mt-2">
                <h2 className="text-xl font-black uppercase text-slate-900">{activeConfig.pluralLabel} Report</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Generated {formatDisplayDate(new Date())}
                </p>
              </div>
              <p className="mt-1 text-xs font-black uppercase text-slate-500">
                Showing {displayedRows.length} of {rows.length} rows
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-3 gap-1.5 xl:justify-self-end xl:w-[min(42rem,100%)]">
              {activeStats.map((item) => (
                <div key={item.label} className="mrs-dashboard-stat mrs-dashboard-stat-fill mrs-surface rounded-xl p-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="no-print mrs-filter-strip shrink-0 space-y-2 border-b border-slate-100 p-2">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
              <FilterField label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={activeConfig.searchPlaceholder}
                    className="mrs-field w-full rounded-lg py-1.5 pl-9 pr-3 text-xs font-bold"
                  />
                </div>
              </FilterField>
              <FilterField label="Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-1.5 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-1.5 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-1.5 text-xs font-black uppercase"
                >
                  <option value="all">All Status</option>
                  {reportStatusOptions(activeConfig).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FilterField>
              <button
                type="button"
                onClick={resetFilters}
                className="mrs-soft-button mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
            {/* Non-lab shows the legend right under the filter row; lab keeps it at the strip end. */}
            {activeConfig.collection !== "labResultRequests" && (
              <StatusLegend options={reportStatusOptions(activeConfig)} />
            )}
            {activeConfig.typeOptions && (
              <div className="flex flex-wrap gap-1.5">
                {activeConfig.typeOptions.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase transition-colors ${
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
            {/* Lab results keeps its legend inside the filter strip; the others move it below. */}
            {activeConfig.collection === "labResultRequests" && (
              <StatusLegend options={reportStatusOptions(activeConfig)} />
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            {(activeConfig.typeOptions ? activeConfig.typeOptions.filter((type) => type.value === selectedType) : [{ value: "all", label: "" }]).map((type) => {
              const tableRows = activeConfig.typeOptions
                ? displayedRows
                : filteredRows;

              return (
                <div key={type.value} className={activeConfig.typeOptions ? "border-b border-slate-100 last:border-b-0" : ""}>
                  {activeConfig.typeOptions && (
                    <div className="mrs-section-band sticky left-0 z-10 border-b border-slate-100 px-4 py-2">
                      <p className="text-sm font-black uppercase text-slate-800">{type.label} {activeConfig.typeHeadingSuffix || "Records"}</p>
                      <p className="text-xs font-bold text-slate-400">{tableRows.length} record(s)</p>
                    </div>
                  )}
                  <table className="w-full table-fixed text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="mrs-section-band border-b border-slate-100">
                        {activeColumns.map((column) => (
                          <th key={column.label} className={`${column.width || "w-[14%]"} whitespace-normal p-3 align-top text-[9px] font-black uppercase leading-tight tracking-widest text-slate-400 xl:p-4 xl:text-[10px]`}>
                            {column.label}
                          </th>
                        ))}
                        {isAdmin && (
                          <th className="w-[9%] p-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 xl:text-[10px]">
                            Actions
                          </th>
                        )}
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
                          {isAdmin && (
                            <td className="p-3 align-top xl:p-4">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteRow(row)}
                                  disabled={pendingAction === `delete-${row.id}`}
                                  className="rounded-xl border border-red-100 p-2 text-red-500 hover:border-red-300 disabled:opacity-60"
                                  aria-label="Delete report record"
                                  title="Delete report record"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {tableRows.length === 0 && (
                        <tr>
                          <td colSpan={activeColumns.length + (isAdmin ? 1 : 0)} className="p-8 text-center">
                            <FileText size={34} className="mx-auto mb-2 text-slate-300" />
                            <p className="font-black uppercase text-slate-700">No Report Rows</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              Add records or adjust report filters.
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
          <div className="mrs-filter-strip shrink-0 border-t border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
            Showing {displayedRows.length} of {rows.length} report rows.
          </div>
        </div>
      </div>

      <FloatingToast
        toast={
          loadError
            ? { type: "error", message: loadError }
            : successMessage
              ? { type: "success", title: "Medical Reports", message: successMessage, ...successMeta }
              : null
        }
        onClose={() => {
          setLoadError("");
          setSuccessMessage("");
          setSuccessMeta(null);
        }}
      />
      <ConfirmationModal
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
        pendingAction={pendingAction}
      />
    </DashboardLayout>
  );
}
