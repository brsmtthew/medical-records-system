import React from "react";
import DashboardLayout from "../components/DashboardLayout";
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

// SAMPLE DATA (you will later replace with Firebase data)
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

const COLORS = ["#16a34a", "#dc2626"];

export default function AdminDashboard() {
  return (
    <DashboardLayout>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-green-700">
          Hospital Admin Dashboard
        </h1>
        <p className="text-gray-500">
          Real-time system overview of charts and patient records
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-600">
          <p className="text-gray-500 text-sm">Total Patients</p>
          <h2 className="text-2xl font-bold">1,240</h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-600">
          <p className="text-gray-500 text-sm">Doctors</p>
          <h2 className="text-2xl font-bold">48</h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-600">
          <p className="text-gray-500 text-sm">Nurses</p>
          <h2 className="text-2xl font-bold">120</h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Borrowed Charts</p>
          <h2 className="text-2xl font-bold text-red-500">32</h2>
        </div>

      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LINE CHART - PATIENT FLOW */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-green-700 font-bold mb-4">
            Weekly Patient Flow
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={patientFlow}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="patients" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART - ACTIVITY */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-green-700 font-bold mb-4">
            Chart Borrowing Activity
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={patientFlow}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="patients" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* PIE CHART */}
      <div className="bg-white p-6 rounded-xl shadow mt-6">

        <h3 className="text-green-700 font-bold mb-4">
          Chart Status Overview
        </h3>

        <div className="flex justify-center">
          <PieChart width={300} height={250}>
            <Pie
              data={chartUsage}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label
            >
              {chartUsage.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        {/* LEGEND */}
        <div className="flex justify-center gap-6 text-sm mt-2">
          <span className="text-green-600 font-bold">● Available</span>
          <span className="text-red-600 font-bold">● Borrowed</span>
        </div>

      </div>

    </DashboardLayout>
  );
}