import React, { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react";

const reportLogs = [
  {
    id: 1,
    patientName: "Juan Dela Cruz",
    caseNumber: "CN-2026-001",
    borrowedBy: "Nurse Maria",
    department: "Emergency Room",
    action: "borrowed",
    timestamp: "2026-04-24T09:15:00",
    dueDate: "2026-04-27",
    remarks: "For ER consultation",
  },
  {
    id: 2,
    patientName: "Maria Santos",
    caseNumber: "CN-2026-002",
    borrowedBy: "Dr. Reyes",
    department: "Internal Medicine",
    action: "returned",
    timestamp: "2026-04-25T14:35:00",
    dueDate: "2026-04-26",
    remarks: "Returned complete",
  },
  {
    id: 3,
    patientName: "Pedro Garcia",
    caseNumber: "CN-2026-003",
    borrowedBy: "Billing Office",
    department: "Billing",
    action: "borrowed",
    timestamp: "2026-04-28T10:20:00",
    dueDate: "2026-05-01",
    remarks: "For insurance processing",
  },
  {
    id: 4,
    patientName: "Ana Lim",
    caseNumber: "CN-2026-004",
    borrowedBy: "Dr. Santos",
    department: "Surgery",
    action: "borrowed",
    timestamp: "2026-04-20T08:45:00",
    dueDate: "2026-04-23",
    remarks: "Pre-op review",
  },
  {
    id: 5,
    patientName: "Ramon Cruz",
    caseNumber: "CN-2026-005",
    borrowedBy: "Records Staff",
    department: "Medical Records",
    action: "returned",
    timestamp: "2026-04-29T16:05:00",
    dueDate: "2026-04-30",
    remarks: "Digitization completed",
  },
];

const today = new Date("2026-04-30T00:00:00");

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(
    0,
    Math.floor((endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0)) / 86400000)
  );
}

function downloadCsv(rows) {
  const headers = [
    "Patient Name",
    "Case Number",
    "Borrowed By",
    "Department",
    "Action",
    "Date and Time",
    "Due Date",
    "Remarks",
  ];
  const csvRows = rows.map((log) =>
    [
      log.patientName,
      log.caseNumber,
      log.borrowedBy,
      log.department,
      log.action,
      formatDateTime(log.timestamp),
      log.dueDate,
      log.remarks,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "chart-activity-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = useMemo(() => {
    return reportLogs.filter((log) => {
      const logDate = log.timestamp.slice(0, 10);
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesSearch = `${log.patientName} ${log.caseNumber} ${log.borrowedBy} ${log.department}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;

      return matchesAction && matchesSearch && matchesStart && matchesEnd;
    });
  }, [actionFilter, searchTerm, startDate, endDate]);

  const activeBorrowed = reportLogs.filter((log) => log.action === "borrowed");
  const overdueCharts = activeBorrowed.filter((log) => new Date(log.dueDate) < today);

  const stats = [
    {
      label: "Report Records",
      value: filteredLogs.length,
      icon: FileText,
      tone: "green",
    },
    {
      label: "Currently Borrowed",
      value: activeBorrowed.length,
      icon: CalendarDays,
      tone: "blue",
    },
    {
      label: "Returned Charts",
      value: reportLogs.filter((log) => log.action === "returned").length,
      icon: RotateCcw,
      tone: "green",
    },
    {
      label: "Overdue Charts",
      value: overdueCharts.length,
      icon: AlertTriangle,
      tone: "red",
    },
  ];

  const resetFilters = () => {
    setActionFilter("all");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Reports</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Audit chart movement, borrowed records, overdue files, and return history.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-black bg-white text-xs font-black uppercase hover:bg-slate-50 transition-colors"
            >
              <Printer size={17} />
              Print
            </button>
            <button
              onClick={() => downloadCsv(filteredLogs)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none transition-all"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="bg-white p-5 rounded-2xl border-2 border-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{item.value}</p>
                </div>
                <div
                  className={`p-2.5 rounded-xl border-2 border-black ${
                    item.tone === "red"
                      ? "bg-red-100 text-red-700"
                      : item.tone === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  <item.icon size={21} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 bg-white border-2 border-black rounded-2xl overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-slate-50 space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search patient, case number, borrower, or department"
                    className="w-full border-2 border-black rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="border-2 border-black rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="border-2 border-black rounded-xl py-2.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-black uppercase text-slate-500 hover:border-black hover:text-black transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {["all", "borrowed", "returned"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActionFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase border-2 transition-colors ${
                      actionFilter === filter
                        ? "bg-black text-white border-black"
                        : "bg-white text-slate-500 border-slate-200 hover:border-black"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-black bg-white">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Patient
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Handler
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Action
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Date
                    </th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-black text-slate-800">{log.patientName}</p>
                        <p className="text-[10px] font-bold uppercase text-green-700">
                          {log.caseNumber}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-black text-slate-700">{log.borrowedBy}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {log.department}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase ${
                            log.action === "borrowed"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">
                          {formatDateTime(log.timestamp)}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Due: {log.dueDate}
                        </p>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-500">
                        {log.remarks}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-10 text-center">
                        <FileText size={38} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-black text-slate-700 uppercase">No records found</p>
                        <p className="text-sm text-slate-400 font-semibold mt-1">
                          Try changing the search, action, or date filter.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border-2 border-black rounded-2xl overflow-hidden h-fit">
            <div className="p-4 border-b-2 border-black bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={20} />
                <h2 className="font-black uppercase">Follow-Up List</h2>
              </div>
              <p className="text-xs font-semibold text-red-600 mt-1">
                Borrowed charts that are past the due date.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {overdueCharts.map((chart) => (
                <div key={chart.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 truncate">{chart.patientName}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        {chart.caseNumber}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                      {daysBetween(chart.dueDate, today)} days
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mt-3">
                    Borrowed by {chart.borrowedBy}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Due {chart.dueDate} • {chart.department}
                  </p>
                </div>
              ))}

              {overdueCharts.length === 0 && (
                <div className="p-8 text-center">
                  <p className="font-black text-slate-700 uppercase">No overdue charts</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Borrowed records are still within their due dates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
