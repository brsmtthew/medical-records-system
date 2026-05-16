import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import { Download, FileText, Printer, RotateCcw, Search } from "lucide-react";
import { subscribeToChartLogs } from "../services/chartService";
import { subscribeToTrackingRows } from "../services/trackingService";
import {
  getTrackingColumns,
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

function formatDateTime(value) {
  const time = recordTimeValue(value);
  if (!time) return "N/A";
  const date = new Date(time);
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatDisplayDate(time)}\n${timePart}`;
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

function rowHasCertificateType(row, type) {
  return Array.isArray(row.typeList) && row.typeList.includes(type);
}

function rowMatchesSelectedType(config, row, type) {
  if (!config.typeOptions || !type) return true;
  if (config.collection === "vitalCertificateRequests") return rowHasCertificateType(row, type);
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

const chartReportConfig = {
  collection: "chartReportLogs",
  pluralLabel: "Chart Report Logs",
  exportName: "chart-report-logs",
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
    { label: "Patient", width: "w-[18%]", wrap: true, value: (row) => `${row.patientName || "N/A"}\n${row.caseNumber || "N/A"}` },
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
    { label: "Status", width: "w-[12%]", wrap: true, value: (row) => row.action || "N/A" },
    {
      label: "Timeline",
      width: "w-[26%]",
      wrap: true,
      value: (row) => [
        `Borrowed: ${formatDateTime(row.borrowedAt || row.timestamp)}`,
        row.action === "returned" ? `Returned: ${formatDateTime(row.returnedAt)}` : "",
        row.action === "canceled" ? `Canceled: ${formatDateTime(row.canceledAt || row.updatedAt)}` : "",
      ].filter(Boolean).join("\n"),
    },
    { label: "Remarks", width: "w-[22%]", wrap: true, value: (row) => row.remarks || "" },
  ],
};

const printReportConfigs = [chartReportConfig, ...trackingReportConfigs];

function cellClassName(column) {
  const base = "p-3 align-top text-xs font-bold leading-snug text-slate-700 xl:p-4 xl:text-sm";
  return column.wrap
    ? `${base} whitespace-pre-line break-words`
    : `${base} overflow-hidden text-ellipsis whitespace-nowrap`;
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
        <div className="no-print flex shrink-0 flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              Print <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              One place to preview, print, and export all reports in the system.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => downloadExcel(filteredRows, activeColumns, activeConfig.exportName)}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
            >
              <Download size={17} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
            >
              <Printer size={17} />
              Print
            </button>
          </div>
        </div>

        <div className="no-print grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
          {printReportConfigs.map((config) => (
            <button
              key={config.collection}
              type="button"
              onClick={() => switchReport(config)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                activeConfig.collection === config.collection
                  ? "border-green-300 bg-green-50"
                  : "mrs-surface"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{config.pluralLabel}</p>
              <p className="mt-1 text-xl font-black text-slate-800">
                {config.collection === chartReportConfig.collection
                  ? chartRows.length
                  : (rowsByCollection[config.collection] || []).length}
              </p>
            </button>
          ))}
        </div>

        <div className="mrs-panel mrs-print-area flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
          <div className="mrs-report-header shrink-0 border-b border-slate-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-700">TGMCI Medical Records</p>
            <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-black uppercase text-slate-900">{activeConfig.pluralLabel} Report</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Generated {new Date().toLocaleString()}
                </p>
              </div>
              <p className="text-xs font-black uppercase text-slate-500">
                Showing {filteredRows.length} of {rows.length} rows
              </p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {activeStats.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="no-print shrink-0 space-y-3 border-b border-slate-100 bg-slate-50 p-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
              <FilterField label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={activeConfig.searchPlaceholder}
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
                  {activeConfig.statusOptions.map((option) => (
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
            {activeConfig.typeOptions && (
              <div className="flex flex-wrap gap-2">
                {activeConfig.typeOptions.map((type) => (
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
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-100">
                  {activeColumns.map((column) => (
                    <th key={column.label} className={`${column.width || "w-[14%]"} break-words p-3 align-top text-[9px] font-black uppercase leading-tight tracking-widest text-slate-400 xl:p-4 xl:text-[10px]`}>
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
                        {column.value(row)}
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

      <FloatingToast
        toast={loadError ? { type: "error", message: loadError } : null}
        onClose={() => setLoadError("")}
      />
    </DashboardLayout>
  );
}
