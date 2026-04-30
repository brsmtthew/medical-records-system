import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion as Motion } from "framer-motion";
import {
  Area,
  AreaChart,
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
  FileScan,
  UserRound,
  Users,
} from "lucide-react";

const scanningActivity = [
  { name: "Mon", scanned: 42, pending: 18 },
  { name: "Tue", scanned: 58, pending: 14 },
  { name: "Wed", scanned: 51, pending: 16 },
  { name: "Thu", scanned: 76, pending: 9 },
  { name: "Fri", scanned: 64, pending: 12 },
  { name: "Sat", scanned: 31, pending: 7 },
];

const chartMovement = [
  { name: "ER", borrowed: 12, returned: 8 },
  { name: "Billing", borrowed: 9, returned: 11 },
  { name: "Surgery", borrowed: 7, returned: 5 },
  { name: "IM", borrowed: 14, returned: 13 },
  { name: "Records", borrowed: 4, returned: 10 },
];

const patientRatio = [
  { name: "Inpatient", value: 156, color: "#16a34a" },
  { name: "Outpatient", value: 3240, color: "#60a5fa" },
];

const recentActivity = [
  { action: "Borrowed", chart: "CN-2026-004", person: "Dr. Santos", time: "8:45 AM", tone: "red" },
  { action: "Returned", chart: "CN-2026-005", person: "Records Staff", time: "4:05 PM", tone: "green" },
  { action: "Scanned", chart: "CN-2026-009", person: "Digitization Desk", time: "3:30 PM", tone: "blue" },
  { action: "Registered", chart: "CN-2026-010", person: "Front Desk", time: "2:10 PM", tone: "green" },
];

const alerts = [
  { label: "Overdue borrowed charts", value: "2", detail: "Needs follow-up today" },
  { label: "Pending scan queue", value: "18", detail: "Awaiting digitization" },
  { label: "Records without barcode", value: "6", detail: "Print labels required" },
];

function StatCard({ item, index }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white p-5 rounded-2xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            {item.label}
          </p>
          <h2 className="text-3xl font-black mt-1 text-slate-800">{item.value}</h2>
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
  const totalPatients = patientRatio.reduce((acc, curr) => acc + curr.value, 0);
  const stats = [
    {
      label: "Registered Patients",
      value: "3,396",
      icon: Users,
      color: "bg-green-100",
      trend: "+42 this week",
      trendColor: "text-green-700",
    },
    {
      label: "Inpatients",
      value: "156",
      icon: Bed,
      color: "bg-emerald-100",
      trend: "4.6% of registry",
      trendColor: "text-slate-500",
    },
    {
      label: "Outpatients",
      value: "3,240",
      icon: UserRound,
      color: "bg-blue-100",
      trend: "95.4% of registry",
      trendColor: "text-slate-500",
    },
    {
      label: "Pending Scans",
      value: "18",
      icon: FileScan,
      color: "bg-amber-100",
      trend: "7 urgent",
      trendColor: "text-amber-700",
    },
  ];

  return (
    <DashboardLayout>
      <Motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            Records <span className="text-green-700">Command Center</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Daily movement, scan progress, patient mix, and follow-up priorities.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 bg-white border-2 border-black rounded-2xl p-2">
          {["Today", "Week", "Month"].map((period, index) => (
            <button
              key={period}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                index === 1 ? "bg-black text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </Motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {stats.map((item, index) => (
          <StatCard key={item.label} item={item} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-7 bg-white p-6 rounded-2xl border-2 border-black"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FileScan className="text-green-700" size={20} />
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Digitization Progress
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">
              Scanned vs pending
            </span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={scanningActivity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontWeight: 800, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "2px solid black", fontWeight: "bold" }} />
              <Area type="monotone" dataKey="scanned" name="Charts Scanned" stroke="#16a34a" fill="#bbf7d0" strokeWidth={3} />
              <Area type="monotone" dataKey="pending" name="Pending Scans" stroke="#f59e0b" fill="#fde68a" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </Motion.div>

        <Motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-5 bg-white p-6 rounded-2xl border-2 border-black"
        >
          <div className="flex items-center gap-2 mb-6">
            <Archive className="text-green-700" size={20} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Chart Movement
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartMovement}>
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
          className="xl:col-span-4 bg-white p-6 rounded-2xl border-2 border-black"
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
                    {((item.value / totalPatients) * 100).toFixed(1)}%
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
