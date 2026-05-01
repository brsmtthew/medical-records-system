import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Edit,
  FileText,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteChartLog,
  subscribeToChartLogs,
  updateChartLog,
} from "../services/firebaseRecords";

const today = new Date();

function formatDateTime(value) {
  if (!value) return "N/A";
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
    "Returned By",
    "Department",
    "Status",
    "Borrowed Date",
    "Returned Date",
    "Due Date",
    "Remarks",
  ];
  const csvRows = rows.map((log) =>
    [
      log.patientName,
      log.caseNumber,
      log.borrowedBy,
      log.returnedBy || "",
      log.department,
      log.action,
      formatDateTime(log.borrowedAt || log.timestamp),
      log.returnedAt ? formatDateTime(log.returnedAt) : "",
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
  const [reportLogs, setReportLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editLog, setEditLog] = useState(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    return subscribeToChartLogs(
      (rows) => {
        setReportLogs(rows);
        setIsLoading(false);
      },
      (error) => {
        setLoadError(error.message || "Unable to load reports from Firebase.");
        setIsLoading(false);
      },
    );
  }, []);

  const filteredLogs = useMemo(() => {
    return reportLogs.filter((log) => {
      const logDate = (log.borrowedAt || log.timestamp || "").slice(0, 10);
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesSearch = `${log.patientName} ${log.caseNumber} ${log.borrowedBy} ${log.returnedBy || ""} ${log.department}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;

      return matchesAction && matchesSearch && matchesStart && matchesEnd;
    });
  }, [actionFilter, reportLogs, searchTerm, startDate, endDate]);

  const activeBorrowed = reportLogs.filter((log) => log.action === "borrowed");
  const overdueCharts = activeBorrowed.filter((log) => new Date(log.dueDate) < today);

  const stats = [
    {
      label: "Total Report Records",
      value: filteredLogs.length,
      icon: FileText,
      tone: "green",
    },
    {
      label: "Number of Borrowed Charts",
      value: activeBorrowed.length,
      icon: CalendarDays,
      tone: "blue",
    },
    {
      label: "Number of Returned Charts",
      value: reportLogs.filter((log) => log.action === "returned").length,
      icon: RotateCcw,
      tone: "green",
    },
    {
      label: "Number of Overdue Charts",
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

  const handleEditLog = (log) => {
    setEditLog({
      ...log,
      borrowedAtInput: (log.borrowedAt || log.timestamp) ? (log.borrowedAt || log.timestamp).slice(0, 16) : "",
      returnedAtInput: log.returnedAt ? log.returnedAt.slice(0, 16) : "",
    });
    setEditError("");
  };

  const handleUpdateLog = async (event) => {
    event.preventDefault();
    if (!editLog.patientName.trim() || !editLog.caseNumber.trim()) {
      setEditError("Patient name and case number are required.");
      return;
    }

    try {
      await updateChartLog(editLog.id, {
        patientName: editLog.patientName.trim(),
        caseNumber: editLog.caseNumber.trim().toUpperCase(),
        borrowedBy: editLog.borrowedBy.trim(),
        returnedBy: editLog.returnedBy?.trim() || "",
        department: editLog.department.trim(),
        action: editLog.action,
        timestamp: editLog.borrowedAtInput ? new Date(editLog.borrowedAtInput).toISOString() : "",
        borrowedAt: editLog.borrowedAtInput ? new Date(editLog.borrowedAtInput).toISOString() : "",
        returnedAt: editLog.returnedAtInput ? new Date(editLog.returnedAtInput).toISOString() : "",
        dueDate: editLog.dueDate || "",
        remarks: editLog.remarks?.trim() || "",
      });
      setEditLog(null);
      setEditError("");
    } catch (error) {
      setEditError(error.message || "Unable to update report row.");
    }
  };

  const handleDeleteLog = async (log) => {
    const confirmed = window.confirm(`Delete report row for ${log.caseNumber}?`);
    if (!confirmed) return;

    try {
      await deleteChartLog(log.id);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Unable to delete report row.");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
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
                  <p className="text-2xl font-black text-slate-800 mt-1">{item.value}</p>
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
                    placeholder="Search patient, case number, borrower, returner, or department"
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

            <div className="overflow-hidden">
              {loadError && (
                <div className="m-4 border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                  {loadError}
                </div>
              )}
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-b-2 border-black bg-white">
                    <th className="w-[19%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Patient
                    </th>
                    <th className="w-[22%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      People
                    </th>
                    <th className="w-[12%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Action
                    </th>
                    <th className="w-[24%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Timeline
                    </th>
                    <th className="w-[14%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Remarks
                    </th>
                    <th className="w-[9%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <p className="font-black text-slate-800 break-words">{log.patientName}</p>
                        <p className="text-[10px] font-bold uppercase text-green-700">
                          {log.caseNumber}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-black text-slate-700">Borrowed: {log.borrowedBy || "N/A"}</p>
                        {log.action === "returned" && (
                          <p className="text-sm font-black text-slate-700">
                            Returned: {log.returnedBy || log.borrowedBy || "N/A"}
                          </p>
                        )}
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {log.department}
                        </p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase ${
                            log.action === "borrowed"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {log.action === "borrowed" ? "borrowed" : "returned"}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-bold text-slate-700">
                          Borrowed: {formatDateTime(log.borrowedAt || log.timestamp)}
                        </p>
                        {log.action === "returned" && (
                          <p className="text-sm font-bold text-slate-700">
                            Returned: {formatDateTime(log.returnedAt)}
                          </p>
                        )}
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Due: {log.dueDate}
                        </p>
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-500 break-words">
                        {log.remarks}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditLog(log)}
                            className="p-2 rounded-xl border-2 border-transparent hover:border-black hover:bg-slate-50 text-slate-500 hover:text-black transition-colors"
                            aria-label={`Edit report row ${log.caseNumber}`}
                          >
                            <Edit size={17} />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log)}
                            className="p-2 rounded-xl border-2 border-transparent hover:border-red-200 hover:bg-red-50 text-red-500 transition-colors"
                            aria-label={`Delete report row ${log.caseNumber}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center">
                        <FileText size={38} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-black text-slate-700 uppercase">
                          {isLoading ? "Loading reports..." : "No records found"}
                        </p>
                        <p className="text-sm text-slate-400 font-semibold mt-1">
                          {isLoading ? "Reading logs from Firebase." : "Borrow or return a chart to create report logs."}
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
                    Borrowed by {chart.borrowedBy || "N/A"}
                  </p>
                  {chart.returnedBy && (
                    <p className="text-xs font-bold text-slate-600 mt-1">
                      Returned by {chart.returnedBy}
                    </p>
                  )}
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

      {editLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditLog(null)} />
          <div className="relative bg-white border-4 border-black rounded-[2rem] p-6 w-full max-w-2xl shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <button
              onClick={() => setEditLog(null)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100"
              aria-label="Close edit report row"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black text-slate-800 uppercase mb-1">Edit Report Row</h2>
            <p className="text-xs font-bold text-slate-400 uppercase mb-5">
              Correct audit log values without changing the current chart status.
            </p>

            <form onSubmit={handleUpdateLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Patient Name</span>
                  <input
                    value={editLog.patientName}
                    onChange={(event) => setEditLog({ ...editLog, patientName: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Case Number</span>
                  <input
                    value={editLog.caseNumber}
                    onChange={(event) => setEditLog({ ...editLog, caseNumber: event.target.value.toUpperCase() })}
                    className="w-full border-2 border-black rounded-xl p-3 font-mono font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Borrowed By</span>
                  <input
                    value={editLog.borrowedBy || ""}
                    onChange={(event) => setEditLog({ ...editLog, borrowedBy: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Returned By</span>
                  <input
                    value={editLog.returnedBy || ""}
                    onChange={(event) => setEditLog({ ...editLog, returnedBy: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Department</span>
                  <input
                    value={editLog.department || ""}
                    onChange={(event) => setEditLog({ ...editLog, department: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Action</span>
                  <select
                    value={editLog.action}
                    onChange={(event) => setEditLog({ ...editLog, action: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold bg-white outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="borrowed">Borrowed</option>
                    <option value="returned">Returned</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Borrowed Date and Time</span>
                  <input
                    type="datetime-local"
                    value={editLog.borrowedAtInput}
                    onChange={(event) => setEditLog({ ...editLog, borrowedAtInput: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Returned Date and Time</span>
                  <input
                    type="datetime-local"
                    value={editLog.returnedAtInput}
                    onChange={(event) => setEditLog({ ...editLog, returnedAtInput: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Due Date</span>
                  <input
                    type="date"
                    value={editLog.dueDate || ""}
                    onChange={(event) => setEditLog({ ...editLog, dueDate: event.target.value })}
                    className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-slate-400">Remarks</span>
                <textarea
                  value={editLog.remarks || ""}
                  onChange={(event) => setEditLog({ ...editLog, remarks: event.target.value })}
                  className="w-full min-h-24 border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>

              {editError && (
                <div className="border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                  {editError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditLog(null)}
                  className="px-5 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none"
                >
                  <Save size={17} />
                  Save Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
