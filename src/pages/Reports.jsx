import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function Reports() {
  const [filter, setFilter] = useState("all");

  // 🧪 SAMPLE DATA
  const logs = [
    {
      id: 1,
      patientName: "Juan Dela Cruz",
      caseNumber: "CN-001",
      borrowedBy: "Nurse Maria",
      action: "borrowed",
      timestamp: "2026-04-29T10:30:00",
    },
    {
      id: 2,
      patientName: "Maria Santos",
      caseNumber: "CN-002",
      borrowedBy: "Dr. Reyes",
      action: "returned",
      timestamp: "2026-04-29T12:15:00",
    },
  ];

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.action === filter;
  });

  return (
    <DashboardLayout>
      <div className="p-6">

        {/* HEADER */}
        <h1 className="text-2xl font-bold mb-4">Reports</h1>

        {/* FILTER */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-200"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter("borrowed")}
            className={`px-4 py-2 rounded ${
              filter === "borrowed"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Borrowed
          </button>

          <button
            onClick={() => setFilter("returned")}
            className={`px-4 py-2 rounded ${
              filter === "returned"
                ? "bg-yellow-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Returned
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Case Number</th>
                <th className="p-3">Borrowed By</th>
                <th className="p-3">Action</th>
                <th className="p-3">Date & Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="p-3">{log.patientName}</td>
                  <td className="p-3">{log.caseNumber}</td>

                  <td className="p-3">{log.borrowedBy}</td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        log.action === "borrowed"
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="p-3">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-4">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}