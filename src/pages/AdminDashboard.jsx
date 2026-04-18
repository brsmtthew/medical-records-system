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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Bed, UserRound, FileScan } from "lucide-react";

/* DATA - Refocused on Scanning and Patient Ratios */
const scanningActivity = [
  { name: "Mon", chartsScanned: 120 },
  { name: "Tue", chartsScanned: 210 },
  { name: "Wed", chartsScanned: 180 },
  { name: "Thu", chartsScanned: 300 },
  { name: "Fri", chartsScanned: 250 },
  { name: "Sat", chartsScanned: 90 },
];

// Replaced Storage Data with Patient Type Data
const patientRatio = [
  { name: "Inpatient", value: 156 },
  { name: "Outpatient", value: 3240 },
];

const COLORS = ["#16a34a", "#bbf7d0"]; // Solid Green for Inpatient, Mint for Outpatient

export default function AdminDashboard() {
  // Calculate percentages for the legend
  const totalPatients = patientRatio.reduce((acc, curr) => acc + curr.value, 0);

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
            Admin <span className="text-green-700">Analytics</span>
          </h1>
          <p className="text-slate-500 font-medium">
            TGMCI Medical Records System • <span className="text-green-600 font-bold">Real-time Data</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border-2 border-black px-5 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-slate-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
            Export Audit Log
          </button>
        </div>
      </Motion.div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Registered", value: "4,829", icon: Users, color: "green" },
          { label: "Inpatients", value: "156", icon: Bed, color: "green" },
          { label: "Outpatients", value: "3,240", icon: UserRound, color: "green" },
          { label: "Pending Scans", value: "18", icon: FileScan, color: "amber" },
        ].map((item, i) => (
          <Motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                <h2 className="text-3xl font-black mt-1 text-slate-800">
                  {item.value}
                </h2>
              </div>
              <div className={`p-2.5 rounded-xl border-2 border-black ${item.color === 'amber' ? 'bg-amber-100' : 'bg-green-100'}`}>
                <item.icon size={22} className="text-slate-900" />
              </div>
            </div>
          </Motion.div>
        ))}
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SCANNING ACTIVITY (Line Chart - Expanded to fill more space) */}
        <Motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white p-6 rounded-3xl border-2 border-black"
        >
          <div className="flex items-center gap-2 mb-6">
            <FileScan className="text-green-700" size={20} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Digitization Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={scanningActivity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '2px solid black', boxShadow: '4px 4px 0px rgba(0,0,0,1)', fontWeight: 'bold' }} 
              />
              <Line 
                name="Charts Scanned"
                type="stepAfter" 
                dataKey="chartsScanned" 
                stroke="#16a34a" 
                strokeWidth={4} 
                dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Motion.div>

        {/* PIE CHART - INPATIENT VS OUTPATIENT RATIO */}
        <Motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-3xl border-2 border-black flex flex-col h-full"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-green-700" size={20} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Patient Ratio</h3>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={patientRatio}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {patientRatio.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} stroke="black" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: '2px solid black', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-3">
            {patientRatio.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border-2 border-transparent hover:border-black transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-black" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-black uppercase text-slate-600 group-hover:text-black transition-colors">{item.name}</span>
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

      </div>
    </DashboardLayout>
  );
}