import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import PatientCaseCell from "../components/PatientCaseCell";
import { motion as Motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  fallbackDepartments,
  subscribeToChartLogs,
  subscribeToCharts,
  subscribeToDepartments,
} from "../services/chartService";
import {
  subscribeToPatients,
} from "../services/patientService";
import { formatDateInputLabel, formatDisplayDate, formatMonthInputLabel } from "../utils/dateFormatting";
import { recordTimeValue } from "../utils/recordSorting";

const periodOptions = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const chartTooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(96, 165, 250, 0.28)",
  borderRadius: "14px",
  boxShadow: "0 16px 32px rgba(2, 6, 23, 0.34)",
  color: "#e2e8f0",
  fontWeight: "bold",
};

const chartTooltipLabelStyle = {
  color: "#f8fafc",
  fontWeight: 900,
  textTransform: "uppercase",
};

const chartTooltipItemStyle = {
  fontWeight: 900,
};

const chartCursorStyle = {
  fill: "rgba(148, 163, 184, 0.12)",
};

// Builds the yyyy-mm-dd value expected by native date inputs.
function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Builds the yyyy-mm value expected by native month inputs.
function toMonthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Normalizes Firestore, Date, and ISO timestamp values into a Date object.
function dateFromRecordValue(value) {
  const time = recordTimeValue(value);
  return time ? new Date(time) : null;
}

// Extracts reusable day, month, and year keys so every dashboard section follows the same period toggle.
function datePartsFromRecordValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    const isoDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const [, year, month, day] = isoDateMatch;
      return {
        date: new Date(Number(year), Number(month) - 1, Number(day)),
        dateKey: `${year}-${month}-${day}`,
        monthKey: `${year}-${month}`,
        yearKey: year,
      };
    }

    const localDateMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (localDateMatch) {
      const [, dayValue, monthValue, year] = localDateMatch;
      const day = dayValue.padStart(2, "0");
      const month = monthValue.padStart(2, "0");
      return {
        date: new Date(Number(year), Number(month) - 1, Number(day)),
        dateKey: `${year}-${month}-${day}`,
        monthKey: `${year}-${month}`,
        yearKey: year,
      };
    }
  }

  const date = dateFromRecordValue(value);
  if (!date || Number.isNaN(date.getTime())) return null;

  return {
    date,
    dateKey: toDateInputValue(date),
    monthKey: toMonthInputValue(date),
    yearKey: String(date.getFullYear()),
  };
}

// Checks whether a timestamp belongs to the selected Today, Monthly, or Yearly view.
function isRecordValueInPeriod(value, period, selectedDate, selectedMonth, selectedYear) {
  if (period === "all") return true;

  const parts = datePartsFromRecordValue(value);
  if (!parts) return false;

  if (period === "today") {
    return parts.dateKey === selectedDate;
  }

  if (period === "monthly") {
    return parts.monthKey === selectedMonth;
  }

  return parts.yearKey === String(selectedYear);
}

// Uses the best available patient timestamp for period-aware dashboard counts.
function isPatientInPeriod(patient, period, selectedDate, selectedMonth, selectedYear) {
  return isRecordValueInPeriod(
    patient.admissionDate || patient.createdAt || patient.updatedAt,
    period,
    selectedDate,
    selectedMonth,
    selectedYear,
  );
}

// Finds the activity date for chart borrow events.
function chartLogBorrowDate(log) {
  return datePartsFromRecordValue(log.borrowedAt || log.timestamp || log.createdAt);
}

// Finds the activity date for chart return events.
function chartLogReturnDate(log) {
  return datePartsFromRecordValue(log.returnedAt);
}

// Keeps chart movement grouped even when older rows are missing a department.
function chartLogDepartment(log) {
  return log.department || "Unassigned";
}

// Turns chart logs into period-filtered movement events used by graphs, tables, and activity rows.
function buildChartMovementEvents(logs, period, selectedDate, selectedMonth, selectedYear) {
  return logs.flatMap((log) => {
    const events = [];
    const borrowedDateParts = chartLogBorrowDate(log);
    const returnedDateParts = chartLogReturnDate(log);

    if (
      borrowedDateParts &&
      isRecordValueInPeriod(log.borrowedAt || log.timestamp || log.createdAt, period, selectedDate, selectedMonth, selectedYear)
    ) {
      events.push({
        type: "borrowed",
        log,
        patientName: log.patientName || "Unknown patient",
        department: chartLogDepartment(log),
        date: borrowedDateParts.date,
      });
    }

    if (
      returnedDateParts &&
      isRecordValueInPeriod(log.returnedAt, period, selectedDate, selectedMonth, selectedYear)
    ) {
      events.push({
        type: "returned",
        log,
        patientName: log.patientName || "Unknown patient",
        department: chartLogDepartment(log),
        date: returnedDateParts.date,
      });
    }

    return events;
  });
}

// Renders a compact top-line metric card with a consistent animation.
function StatCard({ item, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="mrs-dashboard-stat mrs-surface rounded-xl p-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
            {item.label}
          </p>
          <h2 className="mt-0.5 text-base font-black leading-none text-slate-900">{item.value}</h2>
          {item.trend && (
            <p className={`mt-1 text-[9px] font-black uppercase leading-tight ${item.trendColor}`}>
              {item.trend}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-1.5 ${item.color}`}>
          <item.icon size={15} />
        </div>
      </div>
    </Motion.div>
  );
}

// Groups patients by service/location and sorts the busiest departments first.
function buildServiceAnalytics(rows) {
  return Object.entries(
    rows.reduce((counts, patient) => {
      const service = patient.department || "Unassigned";
      counts[service] = (counts[service] || 0) + 1;
      return counts;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((first, second) => second.value - first.value || first.name.localeCompare(second.name));
}

// Renders the service distribution list beside the patient mix chart.
function ServiceList({ title, services, tone }) {
  const maxServiceCount = Math.max(...services.map((service) => service.value), 1);
  const barColor = tone === "green" ? "bg-green-600" : "bg-blue-600";

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-slate-500">{title}</p>
        <span className="text-[10px] font-black text-slate-400">{services.reduce((total, service) => total + service.value, 0)}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {services.map((service) => (
          <div key={`${title}-${service.name}`}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="truncate text-[11px] font-black uppercase text-slate-600">{service.name}</p>
              <span className="text-xs font-black text-slate-800">{service.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.max(6, (service.value / maxServiceCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="flex h-full min-h-20 items-center justify-center rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-black uppercase text-slate-500">No service data</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [charts, setCharts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthInputValue(new Date()));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    const unsubscribePatients = subscribeToPatients(setPatients, console.error);
    const unsubscribeCharts = subscribeToCharts(setCharts, console.error);
    const unsubscribeLogs = subscribeToChartLogs(setLogs, console.error);
    const unsubscribeDepartments = subscribeToDepartments(setDepartments, console.error);

    return () => {
      unsubscribePatients();
      unsubscribeCharts();
      unsubscribeLogs();
      unsubscribeDepartments();
    };
  }, []);

  const periodMovementEvents = buildChartMovementEvents(logs, selectedPeriod, selectedDate, selectedMonth, selectedYear);
  const periodPatients = patients.filter((patient) => isPatientInPeriod(patient, selectedPeriod, selectedDate, selectedMonth, selectedYear));
  const periodInpatientCount = periodPatients.filter((patient) => patient.type === "inpatient").length;
  const periodOutpatientCount = periodPatients.filter((patient) => patient.type === "outpatient").length;
  const newPatientCount = periodPatients.filter((patient) => (patient.recordType || "new") === "new").length;
  const oldPatientCount = periodPatients.filter((patient) => (patient.recordType || "new") === "old").length;
  const patientMix = [
    { name: "Inpatient", value: periodInpatientCount, color: "bg-green-600", text: "text-green-700" },
    { name: "Outpatient", value: periodOutpatientCount, color: "bg-blue-600", text: "text-blue-700" },
    { name: "New", value: newPatientCount, color: "bg-emerald-500", text: "text-emerald-700" },
    { name: "Old", value: oldPatientCount, color: "bg-amber-500", text: "text-amber-700" },
  ];
  const periodPatientTotal = periodPatients.length;
  const maxPatientMix = Math.max(...patientMix.map((item) => item.value), 1);
  const periodInpatients = periodPatients.filter((patient) => patient.type === "inpatient");
  const periodOutpatients = periodPatients.filter((patient) => patient.type === "outpatient");
  const inpatientServices = buildServiceAnalytics(periodInpatients);
  const outpatientServices = buildServiceAnalytics(periodOutpatients);
  const configuredDepartments = departments.length > 0
    ? departments.map((department) => department.name)
    : fallbackDepartments;
  const logDepartments = periodMovementEvents.map((event) => event.department).filter(Boolean);
  const chartDepartmentNames = [...new Set([...configuredDepartments, ...logDepartments])];
  const chartMovementRows = chartDepartmentNames.map((department) => {
    const departmentEvents = periodMovementEvents.filter((event) => event.department === department);
    return {
      name: department,
      borrowed: departmentEvents.filter((event) => event.type === "borrowed").length,
      returned: departmentEvents.filter((event) => event.type === "returned").length,
    };
  });
  const chartMovementData = chartMovementRows.some((row) => row.borrowed > 0 || row.returned > 0)
    ? chartMovementRows
    : [{ name: "No Logs", borrowed: 0, returned: 0 }];
  const recentActivity = [...periodMovementEvents]
    .sort((first, second) => second.date.getTime() - first.date.getTime())
    .map((event) => ({
    action: event.type === "borrowed" ? "Borrowed" : "Returned",
    patientName: event.patientName,
    chart: event.log.caseNumber,
    person: event.type === "returned"
      ? event.log.returnedBy || event.log.borrowedBy || "N/A"
      : event.log.borrowedBy || "N/A",
    time: event.date ? formatDisplayDate(event.date) : "",
    tone: event.type === "borrowed" ? "blue" : "green",
  }));
  const periodLabel = selectedPeriod === "today"
    ? formatDateInputLabel(selectedDate)
    : selectedPeriod === "monthly"
      ? formatMonthInputLabel(selectedMonth)
      : selectedPeriod === "yearly"
        ? selectedYear
        : "ALL RECORDS";
  const allBorrowedCharts = charts.filter((chart) => chart.status === "borrowed").length;
  const allAvailableCharts = charts.filter((chart) => chart.status === "available").length;
  const alerts = [
    { label: "Currently borrowed charts", value: String(allBorrowedCharts), detail: "All active circulation records" },
    { label: "Available charts", value: String(allAvailableCharts), detail: "All charts ready for checkout" },
    { label: "Registered patient charts", value: String(charts.length), detail: "All charts synced from patient registry" },
  ];

  const stats = [
    {
      label: "Total Patients",
      value: periodPatients.length,
      icon: Users,
      color: "bg-cyan-50 text-cyan-700",
      trend: periodLabel,
      trendColor: "text-cyan-700",
    },
    {
      label: "Available Charts",
      value: allAvailableCharts,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-700",
      trend: "Ready for checkout",
      trendColor: "text-slate-500",
    },
    {
      label: "Borrowed Charts",
      value: allBorrowedCharts,
      icon: Archive,
      color: "bg-blue-50 text-blue-700",
      trend: "Active circulation",
      trendColor: "text-blue-700",
    },
    {
      label: "Recent Activity",
      value: recentActivity.length,
      icon: ClipboardCheck,
      color: "bg-amber-50 text-amber-700",
      trend: periodLabel,
      trendColor: "text-amber-700",
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 flex shrink-0 flex-col justify-between gap-2 xl:flex-row xl:items-center"
      >
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
            Records <span className="text-green-700">Dashboard</span>
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Chart movement, patient mix, and active circulation records.
          </p>
        </div>
        <div className="mrs-surface flex flex-col gap-2 rounded-xl p-1.5 sm:flex-row xl:mt-5">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {periodOptions.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase sm:px-3 ${
                  selectedPeriod === period.id ? "bg-green-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          {selectedPeriod !== "all" && (
          <div className="min-w-40">
            {selectedPeriod === "today" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-green-500"
                aria-label="Select day"
              />
            )}
            {selectedPeriod === "monthly" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-green-500"
                aria-label="Select month"
              />
            )}
            {selectedPeriod === "yearly" && (
              <input
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-green-500"
                aria-label="Select year"
              />
            )}
          </div>
          )}
        </div>
      </Motion.div>

      <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
        {stats.map((item, index) => (
          <StatCard key={item.label} item={item} index={index} />
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 overflow-hidden xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)_minmax(0,0.52fr)]">
        <Motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mrs-panel flex min-h-0 flex-col rounded-xl p-3 xl:col-span-7"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Archive className="text-green-700" size={20} />
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                Chart Movement by Department
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">
              {selectedPeriod} report log departments - {periodLabel}
            </span>
          </div>
          <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartMovementData} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontWeight: 700, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={chartCursorStyle}
                itemStyle={chartTooltipItemStyle}
                labelStyle={chartTooltipLabelStyle}
              />
              <Bar dataKey="borrowed" name="Borrowed" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="returned" name="Returned" fill="#15803d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mrs-panel flex min-h-0 flex-col rounded-xl p-3 xl:col-span-5"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="text-green-700" size={20} />
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                Patient Analytics
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">All Totals</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {patientMix.map((item) => (
              <div key={item.name} className="rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">{item.name}</span>
                  <span className={`text-sm font-black ${item.text}`}>{item.value}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.max(5, (item.value / maxPatientMix) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                  {periodPatientTotal ? ((item.value / periodPatientTotal) * 100).toFixed(1) : "0.0"}%
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-blue-700" />
                <p className="text-xs font-black uppercase text-slate-800">Hospital Services</p>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400">
                From loc/dept
              </span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <ServiceList title="Inpatient Services" services={inpatientServices} tone="green" />
              <ServiceList title="Outpatient Services" services={outpatientServices} tone="blue" />
            </div>
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mrs-panel flex min-h-0 flex-col overflow-hidden rounded-xl xl:col-span-6"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
            <ClipboardCheck size={19} className="text-green-700" />
            <h3 className="font-black uppercase text-slate-800">Recent Activities</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">{periodLabel}</span>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {recentActivity.map((item) => (
              <div key={`${item.action}-${item.chart}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <PatientCaseCell patientName={item.patientName} caseNumber={item.chart} />
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                    {item.person} - {item.time}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${
                    item.tone === "red"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : item.tone === "blue"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  {item.action}
                </span>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="row-span-2 flex items-center justify-center px-4 py-6 text-center">
                <div>
                <p className="font-black text-slate-700 uppercase">No activity yet</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  No chart movement in this period.
                </p>
                </div>
              </div>
            )}
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mrs-panel flex min-h-0 flex-col overflow-hidden rounded-xl xl:col-span-6"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={19} className="text-amber-700" />
              <h3 className="font-black uppercase text-slate-800">Activity Status</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">{periodLabel}</span>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 bg-slate-50 p-2.5 sm:grid-cols-3">
            {alerts.map((item, index) => {
              const tones = [
                "border-blue-200 bg-blue-50 text-blue-700",
                "border-green-200 bg-green-50 text-green-700",
                "border-cyan-200 bg-cyan-50 text-cyan-700",
              ];

              return (
                <div key={item.label} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${tones[index]}`}>
                      {item.label}
                    </span>
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-slate-500">{item.detail}</p>
                  </div>
                  <span className="mt-2 text-2xl font-black leading-none text-slate-800">{item.value}</span>
                </div>
              );
            })}
          </div>
        </Motion.div>
      </div>
      </div>
    </DashboardLayout>
  );
}
