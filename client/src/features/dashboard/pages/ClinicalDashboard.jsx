import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import { useAuth } from "@features/auth/context/useAuth";
import { roleLabel, userRoles } from "@shared/constants/userRoles";
import { subscribeToChartRequests } from "@features/charts/services/chartService";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import hospitalImage from "@assets/hospital image.jpg";

function statusBadgeClass(status) {
  if (status === "ready" || status === "returned" || status === "completed") return "mrs-status-success";
  if (status === "canceled") return "mrs-status-danger";
  if (status === "reviewing" || status === "preparing" || status === "received" || status === "inReview") return "mrs-status-info";
  return "mrs-status-warning";
}

export default function ClinicalDashboard() {
  const { currentUser, userProfile, userRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [toast, setToast] = useState(null);
  const assignmentLabel = userRole === userRoles.doctor ? "Clinic" : "Department";
  const assignment = userRole === userRoles.doctor
    ? userProfile?.clinic || "No clinic assigned"
    : userProfile?.department || "No department assigned";
  const isClinicalUser = [userRoles.doctor, userRoles.nurse].includes(userRole);
  const profilePhoto = userProfile?.photoDataUrl || "";
  const clinicalDescription = userProfile?.clinicalDescription || userProfile?.doctorDescription || "";
  const portalSubtitle = userProfile?.clinicalPortalSubtitle
    || "Request charts, track pickup readiness, and review your transaction history from one clinical workspace.";

  useEffect(() => {
    const unsubscribeRequests = subscribeToChartRequests(
      setRequests,
      (error) => setToast({ type: "error", message: error.message || "Unable to load clinical request logs." }),
    );

    return () => unsubscribeRequests();
  }, []);

  const stats = useMemo(() => ([
    { label: "Active Requests", value: requests.filter((request) => !["completed", "canceled"].includes(request.status)).length, icon: ClipboardList },
    { label: "Ready For Pickup", value: requests.filter((request) => request.status === "ready").length, icon: CheckCircle2 },
    { label: "Completed Logs", value: requests.filter((request) => request.status === "completed").length, icon: Clock },
  ]), [requests]);
  const recentRequests = requests.slice(0, 6);

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
        <div className="mrs-panel overflow-hidden rounded-xl">
          <div className="relative min-h-[18rem]">
            <img src={hospitalImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/70" />
            <div className={`relative grid min-h-[18rem] gap-4 p-4 text-white ${isClinicalUser ? "lg:grid-cols-[12.5rem_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_18rem]"} lg:items-stretch`}>
              {isClinicalUser && (
                <div className="flex min-w-0 self-start overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur lg:flex-col">
                  <div className="relative aspect-square w-32 shrink-0 overflow-hidden bg-slate-950/35 sm:w-40 lg:w-full">
                    <div className="absolute inset-0 flex items-center justify-center text-green-200">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound size={72} />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 border-l border-white/15 p-3 lg:border-l-0 lg:border-t">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-200">{roleLabel(userRole)} Profile</p>
                    <p className="mt-1 break-words text-sm font-black uppercase leading-tight">
                      {userProfile?.fullName || currentUser?.displayName || roleLabel(userRole)}
                    </p>
                    <p className="mt-1 break-words text-[10px] font-bold uppercase text-slate-200">{assignment}</p>
                  </div>
                </div>
              )}

              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-200">Version 3 Clinical Workspace</p>
                  <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                    {roleLabel(userRole)} Portal
                  </h1>
                  <p className="mt-2 max-w-3xl text-xs font-semibold leading-relaxed text-slate-100 sm:text-sm">
                    {portalSubtitle}
                  </p>

                  {isClinicalUser && (
                    <div className="mt-5 max-w-3xl rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-green-200">Dashboard Description</p>
                          <p className="mt-1 text-[10px] font-bold uppercase text-slate-200">Clinical profile note</p>
                        </div>
                      </div>

                      <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-xs font-semibold leading-relaxed text-slate-100">
                        {clinicalDescription || "Open clinical settings to add a dashboard description."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {!isClinicalUser && (
                <div className="flex min-w-0 flex-col justify-center rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">{assignmentLabel}</p>
                  <p className="mt-1 break-words text-lg font-black uppercase leading-tight">{assignment}</p>
                  {userProfile?.specialty && (
                    <p className="mt-2 break-words text-xs font-bold uppercase text-green-100">{userProfile.specialty}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="mrs-card rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">{item.value}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700">
                  <item.icon size={19} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mrs-panel min-h-[20rem] overflow-hidden rounded-xl">
          <div className="mrs-section-band flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black uppercase text-slate-900">My Transaction Logs</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Latest doctor/nurse chart request activity.</p>
            </div>
            <Link to="/chart-requests" className="mrs-soft-button rounded-lg px-3 py-2 text-[10px] font-black uppercase">
              View All
            </Link>
          </div>
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-[30%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Patient / Case</th>
                  <th className="w-[26%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose</th>
                  <th className="w-[17%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.map((request) => (
                  <tr key={request.id} className="mrs-table-row">
                    <td className="p-3">
                      <p className="text-xs font-black uppercase text-slate-900">{request.patientName || "No patient name"}</p>
                      <p className="mt-1 font-mono text-[10px] font-black uppercase text-green-700">{request.caseNumber}</p>
                    </td>
                    <td className="p-3 text-xs font-bold leading-snug text-slate-600">{request.purpose || "No purpose saved"}</td>
                    <td className="p-3">
                      <span className={`mrs-status-badge ${statusBadgeClass(request.status)}`}>{request.status || "pending"}</span>
                    </td>
                    <td className="p-3 text-xs font-black uppercase text-slate-500">{formatDisplayDate(request.updatedAt || request.createdAt)}</td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <ClipboardList size={34} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No transaction logs yet</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Your chart request actions will appear here.</p>
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
