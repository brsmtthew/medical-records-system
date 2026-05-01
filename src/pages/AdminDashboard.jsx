import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion as Motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Archive,
  Bed,
  ClipboardCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  fallbackDepartments,
  subscribeToChartLogs,
  subscribeToCharts,
  subscribeToDepartments,
  subscribeToPatients,
} from "../services/firebaseRecords";

const periodOptions = [
  { id: "today", label: "Today" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function toMonthInputValue(date) {
  return date.toISOString().slice(0, 7);
}

function isLogInPeriod(log, period, selectedDate, selectedMonth, selectedYear) {
  const value = log.borrowedAt || log.timestamp;
  if (!value) return false;

  const logDate = new Date(value);

  if (period === "today") {
    return toDateInputValue(logDate) === selectedDate;
  }

  if (period === "monthly") {
    return toMonthInputValue(logDate) === selectedMonth;
  }

  return String(logDate.getFullYear()) === String(selectedYear);
}

function StatCard({ item, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            {item.label}
          </p>
          <h2 className="text-2xl font-black mt-1 text-slate-800">{item.value}</h2>
          <p className={`text-[10px] font-black uppercase mt-2 ${item.trendColor}`}>
            {item.trend}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl border-2 border-black ${item.color}`}>
          <item.icon size={22} className="text-slate-900" />
        </div>
      </div>
    </Motion.div>
  );
}

export default function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [charts, setCharts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
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

  const today = new Date();
  const inpatientCount = patients.filter((patient) => patient.type === "inpatient").length;
  const outpatientCount = patients.filter((patient) => patient.type === "outpatient").length;
  const borrowedCharts = charts.filter((chart) => chart.status === "borrowed");
  const overdueCharts = borrowedCharts.filter((chart) => chart.dueDate && new Date(chart.dueDate) < today);
  const patientRatio = [
    { name: "Inpatient", value: inpatientCount, color: "#16a34a" },
    { name: "Outpatient", value: outpatientCount, color: "#60a5fa" },
  ];
  const totalPatients = patientRatio.reduce((acc, curr) => acc + curr.value, 0);
  const configuredDepartments = departments.length > 0
    ? departments.map((department) => department.name)
    : fallbackDepartments;
  const periodLogs = logs.filter((log) => isLogInPeriod(log, selectedPeriod, selectedDate, selectedMonth, selectedYear));
  const logDepartments = periodLogs.map((log) => log.department).filter(Boolean);
  const chartDepartmentNames = [...new Set([...configuredDepartments, ...logDepartments])];
  const chartMovementRows = chartDepartmentNames.map((department) => {
    const departmentLogs = periodLogs.filter((log) => (log.department || "Unassigned") === department);
    return {
      name: department,
      borrowed: departmentLogs.filter((log) => log.action === "borrowed").length,
      returned: departmentLogs.filter((log) => log.action === "returned").length,
    };
  });
  const chartMovementData = chartMovementRows.some((row) => row.borrowed > 0 || row.returned > 0)
    ? chartMovementRows
    : [{ name: "No Logs", borrowed: 0, returned: 0 }];
  const recentActivity = logs.slice(0, 4).map((log) => ({
    action: log.action === "borrowed" ? "Borrowed" : "Returned",
    chart: log.caseNumber,
    person: log.borrowedBy || "N/A",
    time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    tone: log.action === "borrowed" ? "red" : "green",
  }));
  const alerts = [
    { label: "Overdue borrowed charts", value: String(overdueCharts.length), detail: "Needs follow-up today" },
    { label: "Currently borrowed charts", value: String(borrowedCharts.length), detail: "Active circulation records" },
    { label: "Registered patient charts", value: String(charts.length), detail: "Synced from patient registry" },
  ];

  const stats = [
    {
      label: "Registered Patients",
      value: patients.length,
      icon: Users,
      color: "bg-green-100",
      trend: "Synced from Firebase",
      trendColor: "text-green-700",
    },
    {
      label: "Inpatients",
      value: inpatientCount,
      icon: Bed,
      color: "bg-emerald-100",
      trend: `${totalPatients ? ((inpatientCount / totalPatients) * 100).toFixed(1) : "0.0"}% of registry`,
      trendColor: "text-slate-500",
    },
    {
      label: "Outpatients",
      value: outpatientCount,
      icon: UserRound,
      color: "bg-blue-100",
      trend: `${totalPatients ? ((outpatientCount / totalPatients) * 100).toFixed(1) : "0.0"}% of registry`,
      trendColor: "text-slate-500",
    },
    {
      label: "Borrowed Charts",
      value: borrowedCharts.length,
      icon: Archive,
      color: "bg-amber-100",
      trend: `${overdueCharts.length} overdue`,
      trendColor: "text-amber-700",
    },
  ];

  const periodLabel = selectedPeriod === "today"
    ? selectedDate
    : selectedPeriod === "monthly"
      ? selectedMonth
      : selectedYear;

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col xl:flex-row xl:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            Records <span className="text-green-700">Command Center</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Chart movement, patient mix, and follow-up priorities from Firebase records.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 bg-white border-2 border-black rounded-2xl p-2">
          <div className="grid grid-cols-3 gap-2">
            {periodOptions.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                  selectedPeriod === period.id ? "bg-black text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <div className="min-w-40">
            {selectedPeriod === "today" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-black"
                aria-label="Select day"
              />
            )}
            {selectedPeriod === "monthly" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-black"
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
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-black"
                aria-label="Select year"
              />
            )}
          </div>
        </div>
      </Motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {stats.map((item, index) => (
          <StatCard key={item.label} item={item} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-8 bg-white p-4 rounded-2xl border-2 border-black"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Archive className="text-green-700" size={20} />
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Chart Movement by Department
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">
              {selectedPeriod} report log departments • {periodLabel}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartMovementData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontWeight: 800, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "2px solid black", fontWeight: "bold" }} />
              <Bar dataKey="borrowed" name="Borrowed" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="returned" name="Returned" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-4 bg-white p-4 rounded-2xl border-2 border-black"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-green-700" size={20} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Patient Ratio
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={patientRatio} innerRadius={60} outerRadius={82} paddingAngle={8} dataKey="value">
                {patientRatio.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="black" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "2px solid black", fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {patientRatio.map((item) => (
              <div key={item.name} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-black" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-black uppercase text-slate-600">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-800 leading-none">{item.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    {totalPatients ? ((item.value / totalPatients) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-4 bg-white rounded-2xl border-2 border-black overflow-hidden"
        >
          <div className="p-4 border-b-2 border-black bg-slate-50 flex items-center gap-2">
            <ClipboardCheck size={19} className="text-green-700" />
            <h3 className="font-black uppercase text-slate-800">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <div key={`${item.action}-${item.chart}`} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-800 text-sm">{item.chart}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    {item.person} • {item.time}
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
              <div className="p-6 text-center">
                <p className="font-black text-slate-700 uppercase">No activity yet</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Borrow or return a chart to populate this list.
                </p>
              </div>
            )}
          </div>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-4 bg-white rounded-2xl border-2 border-black overflow-hidden"
        >
          <div className="p-4 border-b-2 border-black bg-amber-50 flex items-center gap-2">
            <AlertTriangle size={19} className="text-amber-700" />
            <h3 className="font-black uppercase text-slate-800">Priority Queue</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.map((item) => (
              <div key={item.label} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.detail}</p>
                </div>
                <span className="text-2xl font-black text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </Motion.div>
      </div>
    </DashboardLayout>
  );
}
