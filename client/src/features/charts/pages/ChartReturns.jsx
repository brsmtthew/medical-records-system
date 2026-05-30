import React, { useEffect, useMemo, useState } from "react";
import { Clock, FileText, RotateCcw, Search } from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import { subscribeToChartRequests, updateChartRequest } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";
import { formatDisplayDate } from "@shared/utils/dateFormatting";

const returnStatuses = new Set(["received", "for_return", "returned"]);

function searchable(value) {
  return String(value || "").toLowerCase();
}

function statusBadge(status) {
  if (status === "received") return "mrs-status-info";
  if (status === "for_return") return "mrs-status-warning";
  return "mrs-status-success";
}

function statusLabel(status) {
  if (status === "for_return") return "Waiting for Records";
  if (status === "returned") return "Return Confirmed";
  return "Received";
}

export default function ChartReturns() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToChartRequests(
      setRequests,
      (error) => setToast({ type: "error", message: error.message || "Unable to load return records." }),
    );

    return () => unsubscribe();
  }, []);

  const rows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      if (request.requestedById !== currentUser?.uid) return false;
      if (!returnStatuses.has(request.status)) return false;
      if (!query) return true;

      return [
        request.caseNumber,
        request.patientName,
        request.purpose,
        request.requestedByClinic,
        request.requestedByDepartment,
        request.status,
      ].some((value) => searchable(value).includes(query));
    });
  }, [currentUser?.uid, requests, searchTerm]);

  const markReturn = async (request) => {
    try {
      setPendingId(request.id);
      await updateChartRequest(request.id, {
        status: "for_return",
        returnRequestedAt: new Date().toISOString(),
      });
      setToast({
        type: "success",
        title: "Return Submitted",
        message: `${request.caseNumber} is waiting for Medical Records confirmation.`,
        action: "Chart For Return",
        audit: true,
        caseNumber: request.caseNumber,
        patientName: request.patientName,
      });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to mark this chart for return." });
    } finally {
      setPendingId("");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)] xl:items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">
              Return <span className="text-green-700">Charts</span>
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Mark borrowed charts for return; Medical Records confirms the physical chart before it becomes available.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="mrs-card rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Received</p>
              <p className="mt-1 text-xl font-black leading-none text-slate-800">{rows.filter((row) => row.status === "received").length}</p>
            </div>
            <div className="mrs-card rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pending</p>
              <p className="mt-1 text-xl font-black leading-none text-slate-800">{rows.filter((row) => row.status === "for_return").length}</p>
            </div>
            <div className="mrs-card rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Confirmed</p>
              <p className="mt-1 text-xl font-black leading-none text-slate-800">{rows.filter((row) => row.status === "returned").length}</p>
            </div>
          </div>
        </div>

        <div className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search borrowed charts by patient, case, purpose, or unit"
              className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
            />
          </div>
        </div>

        <div className="mrs-panel min-h-0 flex-1 overflow-hidden rounded-xl">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[840px] table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-200">
                  <th className="w-[28%] p-3 text-[10px] font-black uppercase text-slate-400">Patient / Case</th>
                  <th className="w-[28%] p-3 text-[10px] font-black uppercase text-slate-400">Purpose / Unit</th>
                  <th className="w-[20%] p-3 text-[10px] font-black uppercase text-slate-400">Dates</th>
                  <th className="w-[12%] p-3 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="w-[12%] p-3 text-right text-[10px] font-black uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((request) => (
                  <tr key={request.id} className="mrs-table-row">
                    <td className="p-3">
                      <PatientCaseCell patientName={request.patientName} caseNumber={request.caseNumber} />
                    </td>
                    <td className="p-3">
                      <p className="break-words text-xs font-black uppercase text-slate-700">{request.purpose || "Chart request"}</p>
                      <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-400">
                        {request.requestedByClinic || request.requestedByDepartment || "No assignment"}
                      </p>
                    </td>
                    <td className="p-3 text-[10px] font-black uppercase leading-tight text-slate-500">
                      <p>Borrowed: {formatDisplayDate(request.borrowedAt || request.approvedAt)}</p>
                      {request.returnRequestedAt && <p>Marked: {formatDisplayDate(request.returnRequestedAt)}</p>}
                      {request.returnConfirmedAt && <p>Confirmed: {formatDisplayDate(request.returnConfirmedAt)}</p>}
                    </td>
                    <td className="p-3">
                      <span className={`mrs-status-badge gap-1 ${statusBadge(request.status)}`}>
                        {request.status === "for_return" ? <Clock size={13} /> : request.status === "received" ? <FileText size={13} /> : <RotateCcw size={13} />}
                        {statusLabel(request.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {request.status === "received" ? (
                        <button
                          type="button"
                          onClick={() => markReturn(request)}
                          disabled={pendingId === request.id}
                          className="mrs-primary-button rounded-lg px-3 py-2 text-[10px] font-black uppercase disabled:opacity-60"
                        >
                          {pendingId === request.id ? "Sending" : "Return"}
                        </button>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-slate-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <RotateCcw size={38} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No received charts found</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Approved chart requests will appear here for return tracking.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FloatingToast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
