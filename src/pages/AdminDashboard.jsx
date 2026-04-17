import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import { motion as Motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, UserPlus, Stethoscope, FileWarning } from "lucide-react"; // Install lucide-react for icons

/* DATA */
const patientFlow = [
  { name: "Mon", patients: 30 },
  { name: "Tue", patients: 45 },
  { name: "Wed", patients: 38 },
  { name: "Thu", patients: 60 },
  { name: "Fri", patients: 55 },
  { name: "Sat", patients: 70 },
];

const chartUsage = [
  { name: "Borrowed", value: 32 },
  { name: "Available", value: 68 },
];

const COLORS = ["#16a34a", "#e2e8f0"]; // Professional green and soft slate

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      {/* HEADER SECTION */}
      <Motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            Admin <span className="text-green-700">Overview</span>
          </h1>
          <p className="text-slate-500 font-medium">
            System status: <span className="text-green-600">Operational</span> • Real-time medical records tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border-2 border-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
            Download Report
          </button>
          <button className="bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-800 transition-all shadow-lg shadow-green-200">
            System Settings
          </button>
        </div>
      </Motion.div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Patients", value: "1,240", icon: Users, color: "green" },
          { label: "Doctors", value: "48", icon: Stethoscope, color: "green" },
          { label: "Nurses", value: "120", icon: UserPlus, color: "green" },
          { label: "Borrowed Charts", value: "32", icon: FileWarning, color: "red" },
        ].map((item, i) => (
          <Motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{item.label}</p>
                <h2 className={`text-3xl font-black mt-1 ${item.color === 'red' ? 'text-red-600' : 'text-slate-800'}`}>
                  {item.value}
                </h2>
              </div>
              <div className={`p-2 rounded-lg ${item.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                <item.icon size={20} />
              </div>
            </div>
          </Motion.div>
        ))}
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WEEKLY FLOW (Line) */}
        <Motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white p-6 rounded-3xl border-2 border-black shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Weekly Patient Intake</h3>
            <select className="text-xs font-bold border-2 border-black rounded-lg px-2 py-1">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={patientFlow}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '2px solid black', boxShadow: '4px 4px 0px rgba(0,0,0,1)' }} 
              />
              <Line 
                type="monotone" 
                dataKey="patients" 
                stroke="#16a34a" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Motion.div>

        {/* STATUS (Pie) */}
        <Motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border-2 border-black shadow-sm flex flex-col items-center justify-center"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-2 self-start">Records Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartUsage}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartUsage.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} stroke="none" />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-full space-y-2 mt-4">
            {chartUsage.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-slate-500 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </Motion.div>

        {/* ACTIVITY (Bar) - Full Width on Bottom */}
        <Motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-white p-6 rounded-3xl border-2 border-black shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-6">Activity Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={patientFlow}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="patients" fill="#16a34a" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Motion.div>
      </div>
    </DashboardLayout>
  );
}