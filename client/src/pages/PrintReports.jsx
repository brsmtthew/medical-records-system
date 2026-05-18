import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import PatientCaseCell from "../components/PatientCaseCell";
import { Download, Eye, FileText, Printer, RotateCcw, Search, X } from "lucide-react";
import { subscribeToChartLogs } from "../services/chartService";
import { subscribeToTrackingRows } from "../services/trackingService";
import {
  getTrackingColumns,
  releaseStatuses,
  statusBadgeClass,
  statusTextClass,
  trackingReportConfigs,
} from "../utils/trackingConfigs";
import { formatDisplayDate } from "../utils/dateFormatting";
import { recordTimeValue } from "../utils/recordSorting";

function escapeExcelValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadExcel(rows, columns, fileName) {
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
            <tr>${columns.map((column) => `<th>${escapeExcelValue(column.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${columns.map((column) => `<td>${escapeExcelValue(column.value(row))}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateOnlyDisplay(value) {
  const time = recordTimeValue(value);
  return time ? formatDisplayDate(time) : "N/A";
}

function dateOnly(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function rowMatchesDateRange(row, startDate, endDate, keys) {
  if (!startDate && !endDate) return true;

  const dates = keys.map((key) => dateOnly(row[key])).filter(Boolean);
  return dates.some((date) => (!startDate || date >= startDate) && (!endDate || date <= endDate));
}

function reportSearchValue(row, columns) {
  return columns.map((column) => column.value(row)).join(" ").toLowerCase();
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

const chartReportConfig = {
  collection: "chartReportLogs",
  pluralLabel: "Chart Reports",
  exportName: "chart-reports",
  searchPlaceholder: "Search patient, case number, borrower, returner, or department",
  statusOptions: [
    { value: "borrowed", label: "Borrowed" },
    { value: "returned", label: "Returned" },
    { value: "canceled", label: "Canceled" },
  ],
  dateKeys: ["borrowedAt", "returnedAt", "canceledAt", "updatedAt", "timestamp"],
  matchesStatus: (row, status) => row.action === status,
  stats: (rows) => [
    { label: "Total Logs", value: rows.length },
    { label: "Borrowed", value: rows.filter((row) => row.action === "borrowed").length },
    { label: "Returned", value: rows.filter((row) => row.action === "returned").length },
  ],
  columns: [
    { label: "Patient", width: "w-[18%]", wrap: true, patientCase: true, value: (row) => `${row.patientName || "N/A"}\n${row.caseNumber || "N/A"}` },
    {
      label: "People",
      width: "w-[22%]",
      wrap: true,
      value: (row) => [
        `Borrowed: ${row.borrowedBy || "N/A"}`,
        row.action === "returned" ? `Returned: ${row.returnedBy || row.borrowedBy || "N/A"}` : "",
        row.department || "",
      ].filter(Boolean).join("\n"),
    },
    { label: "Status", width: "w-[12%]", wrap: true, statusKey: "action", value: (row) => row.action || "N/A" },
    {
      label: "Timeline",
      width: "w-[26%]",
      wrap: true,
      toneKey: "action",
      value: (row) => [
        `Borrowed: ${formatDateOnlyDisplay(row.borrowedAt || row.timestamp)}`,
        row.action === "returned" ? `Returned: ${formatDateOnlyDisplay(row.returnedAt)}` : "",
        row.action === "canceled" ? `Canceled: ${formatDateOnlyDisplay(row.canceledAt || row.updatedAt)}` : "",
      ].filter(Boolean).join("\n"),
    },
    { label: "Remarks", width: "w-[22%]", wrap: true, value: (row) => row.remarks || "" },
  ],
};

const printReportConfigs = [chartReportConfig, ...trackingReportConfigs];

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

function rowTimelineStatus(row, column) {
  return row[column.toneKey]
    || row[column.statusKey]
    || row.releaseStatus
    || row.reviewStatus
    || row.paymentStatus
    || row.action
    || column.statusFallback;
}

function renderMultilineValue(value, tone) {
  const lines = String(value || "N/A").split("\n").filter(Boolean);
  const toneClass = tone ? statusTextClass(tone) : "";

  return (
    <div className="mrs-value-stack space-y-1 text-[10px] font-bold uppercase leading-tight xl:text-[11px]">
      {lines.map((line, index) => {
        const [label, ...rest] = line.split(":");
        const hasLabel = rest.length > 0;
        const colorClass = toneClass || (index === 0 ? "text-blue-700" : "text-green-700");

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

function renderCellValue(column, row) {
  const value = column.value(row);

  if (column.patientCase) {
    return <PatientCaseCell patientName={row.patientName} caseNumber={row.caseNumber} />;
  }
  if (column.dateRange) {
    const [firstValue = "N/A", secondValue = "N/A"] = String(value || "")
      .split("\n")
      .map((item) => item.replace(/^[^:]+:\s*/, ""));
    const toneClass = statusTextClass(rowTimelineStatus(row, column));

    return (
      <div className="mrs-value-stack space-y-1 text-[10px] font-black uppercase leading-tight">
        <p className="break-words">
          <span className={`mrs-value-label ${toneClass}`}>{column.dateRange.firstLabel}</span>
          <span className="mrs-value-main">{stackDateTimeText(firstValue)}</span>
        </p>
        <p className="break-words">
          <span className={`mrs-value-label ${toneClass}`}>{column.dateRange.secondLabel}</span>
          <span className="mrs-value-main">{stackDateTimeText(secondValue)}</span>
        </p>
      </div>
    );
  }
  if (column.dateLines) {
    return renderMultilineValue(value, rowTimelineStatus(row, column));
  }

  if (column.indicator) {
    return (
      <span className={`inline-flex max-w-full rounded-lg border px-2 py-1 text-[10px] font-black uppercase leading-tight whitespace-normal ${indicatorClassName(column.indicator)}`}>
        {value || "N/A"}
      </span>
    );
  }

  if (column.wrap && String(value || "").includes("\n")) {
    return renderMultilineValue(value, column.toneKey ? rowTimelineStatus(row, column) : "");
  }

  if (!column.statusKey) return value;

  return (
    <span className={`mrs-status-badge ${statusBadgeClass(row[column.statusKey] || column.statusFallback)}`}>
      {value}
    </span>
  );
}

function reportStatusOptions(config) {
  const mergedStatuses = [...config.statusOptions];
  releaseStatuses.forEach((status) => {
    if (!mergedStatuses.some((option) => option.value === status.value)) {
      mergedStatuses.push(status);
    }
  });
  return mergedStatuses;
}

function reportLegendOptions(config) {
  if (["medicalDocumentRequests", "labResultRequests", "vitalCertificateRequests"].includes(config.collection)) {
    return reportStatusOptions(config);
  }

  return reportStatusOptions(config).filter((option) => !["forRelease", "released"].includes(option.value));
}

function ExcelPreviewModal({ columns, fileName, isOpen, onClose, onExport, rows, title }) {
  if (!isOpen) return null;

  const previewRows = rows.slice(0, 25);

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="mrs-panel flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
          <div>
            <p className="text-lg font-black uppercase text-slate-800">Excel Export Preview</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {title} - {rows.length} row(s) ready for {fileName}.xls
            </p>
          </div>
          <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl p-2" aria-label="Close preview">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-100">
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className={`${column.width || "w-[14%]"} whitespace-normal p-3 align-top text-[9px] font-black uppercase leading-tight tracking-widest text-slate-400`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, rowIndex) => (
                <tr key={`${row.id || rowIndex}-excel-preview`} className="mrs-table-row">
                  {columns.map((column) => (
                    <td key={column.label} className={cellClassName(column)}>
                      {column.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {previewRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-10 text-center">
                    <FileText size={38} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-black uppercase text-slate-700">No Rows To Export</p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">Adjust filters or add records first.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <p className="text-xs font-semibold text-slate-500">
            Preview shows first {previewRows.length} of {rows.length} row(s).
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
              Cancel
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={rows.length === 0}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintReports() {
  const [activeCollection, setActiveCollection] = useState(chartReportConfig.collection);
  const [chartRows, setChartRows] = useState([]);
  const [rowsByCollection, setRowsByCollection] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isExcelPreviewOpen, setIsExcelPreviewOpen] = useState(false);
  const activeConfig = printReportConfigs.find((config) => config.collection === activeCollection) || chartReportConfig;
  const activeColumns = activeConfig.collection === chartReportConfig.collection
    ? activeConfig.columns
    : getTrackingColumns(activeConfig, selectedType);
  const rows = useMemo(
    () => (
      activeConfig.collection === chartReportConfig.collection
        ? chartRows
        : rowsByCollection[activeConfig.collection] || []
    ),
    [activeConfig.collection, chartRows, rowsByCollection],
  );

  useEffect(() => {
    const unsubscribeChartLogs = subscribeToChartLogs(
      setChartRows,
      (error) => setLoadError(error.message || "Unable to load chart report logs."),
    );
    const unsubscribeTracking = trackingReportConfigs.map((config) => (
      subscribeToTrackingRows(
        config.collection,
        (nextRows) => setRowsByCollection((current) => ({ ...current, [config.collection]: nextRows })),
        (error) => setLoadError(error.message || "Unable to load print reports."),
      )
    ));

    return () => {
      unsubscribeChartLogs();
      unsubscribeTracking.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const dateKeys = activeConfig.dateKeys || ["requestedAt", "reviewedAt", "releasedAt"];

    return rows.filter((row) => {
      const matchesSearch = !search || reportSearchValue(row, activeColumns).includes(search);
      const matchesStatus = statusFilter === "all" || (
        activeConfig.matchesStatus
          ? activeConfig.matchesStatus(row, statusFilter)
          : activeConfig.statusValue(row) === statusFilter
      );
      const matchesDate = rowMatchesDateRange(row, startDate, endDate, dateKeys);
      const matchesType = rowMatchesSelectedType(activeConfig, row, selectedType);
      return matchesSearch && matchesStatus && matchesDate && matchesType;
    });
  }, [activeColumns, activeConfig, endDate, rows, searchTerm, selectedType, startDate, statusFilter]);

  const activeStats = activeConfig.stats(filteredRows);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const switchReport = (config) => {
    setActiveCollection(config.collection);
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSelectedType(config.typeOptions?.[0]?.value || "");
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="no-print grid shrink-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              Print <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              One place to preview, print, and export all reports in the system.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-4 gap-1.5 xl:justify-self-end xl:w-[min(56rem,100%)]">
            {printReportConfigs.map((config) => (
              <button
                key={config.collection}
                type="button"
                onClick={() => switchReport(config)}
                className={`mrs-dashboard-stat-fill rounded-xl border p-2 text-left transition-colors ${
                  activeConfig.collection === config.collection
                    ? "border-green-300 bg-green-50"
                    : "mrs-surface"
                }`}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.pluralLabel}</p>
                <p className="mt-0.5 text-base font-black leading-none text-slate-800">
                  {config.collection === chartReportConfig.collection
                    ? chartRows.length
                    : (rowsByCollection[config.collection] || []).length}
                </p>
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
                  Generated {new Date().toLocaleString()}
                </p>
              </div>
              <div className="mt-1">
                <p className="text-xs font-black uppercase text-slate-500">
                  Showing {filteredRows.length} of {rows.length} rows
                </p>
              </div>
            </div>
            <div className="min-w-0 space-y-2 xl:justify-self-end xl:w-[min(42rem,100%)]">
              <div className="no-print flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExcelPreviewOpen(true)}
                  className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                >
                  <Eye size={15} />
                  Preview Excel
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                >
                  <Printer size={15} />
                  Print
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {activeStats.map((item) => (
                  <div key={item.label} className="mrs-dashboard-stat mrs-dashboard-stat-fill mrs-surface rounded-xl p-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="no-print shrink-0 space-y-2 border-b border-slate-100 bg-slate-50 p-2">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
              <FilterField label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={activeConfig.searchPlaceholder}
                    className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
                  />
                </div>
              </FilterField>
              <FilterField label="Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase"
                />
              </FilterField>
              <FilterField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase"
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
                className="mrs-soft-button mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
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
            <StatusLegend options={reportLegendOptions(activeConfig)} />
          </div>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[980px] table-fixed text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-100">
                  {activeColumns.map((column) => (
                    <th key={column.label} className={`${column.width || "w-[14%]"} whitespace-normal p-3 align-top text-[9px] font-black uppercase leading-tight tracking-widest text-slate-400 xl:p-4 xl:text-[10px]`}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={`${activeConfig.collection}-${row.id}`} className="mrs-table-row">
                    {activeColumns.map((column) => (
                      <td key={column.label} title={String(column.value(row) || "")} className={cellClassName(column)}>
                        {renderCellValue(column, row)}
                      </td>
                    ))}
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={activeColumns.length} className="p-10 text-center">
                      <FileText size={38} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No Report Rows</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Add records or adjust report filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ExcelPreviewModal
        columns={activeColumns}
        fileName={activeConfig.exportName}
        isOpen={isExcelPreviewOpen}
        onClose={() => setIsExcelPreviewOpen(false)}
        onExport={() => {
          downloadExcel(filteredRows, activeColumns, activeConfig.exportName);
          setIsExcelPreviewOpen(false);
        }}
        rows={filteredRows}
        title={activeConfig.pluralLabel}
      />

      <FloatingToast
        toast={loadError ? { type: "error", message: loadError } : null}
        onClose={() => setLoadError("")}
      />
    </DashboardLayout>
  );
}
