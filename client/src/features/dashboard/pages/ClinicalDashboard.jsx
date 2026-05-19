import React from "react";
import { ClipboardList, Clock, Hospital, Stethoscope } from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "@features/auth/context/useAuth";
import { roleLabel, userRoles } from "@shared/constants/userRoles";

export default function ClinicalDashboard() {
  const { userProfile, userRole } = useAuth();
  const assignmentLabel = userRole === userRoles.doctor ? "Clinic" : "Department";
  const assignment = userRole === userRoles.doctor
    ? userProfile?.clinic || "No clinic assigned"
    : userProfile?.department || "No department assigned";

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="mrs-panel rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700">Version 3 Clinical Workspace</p>
              <h1 className="mt-2 text-2xl font-black uppercase text-slate-900">
                {roleLabel(userRole)} Portal
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                This workspace is prepared for chart request transactions, pickup notifications, and return tracking for doctors and nurses.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{assignmentLabel}</p>
              <p className="mt-1 text-lg font-black uppercase text-slate-900">{assignment}</p>
              {userProfile?.specialty && (
                <p className="mt-1 text-xs font-bold uppercase text-violet-700">{userProfile.specialty}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Request Patient Chart",
              text: "Submit a digital request so Medical Records can prepare the physical chart for pickup.",
              icon: ClipboardList,
            },
            {
              title: "Pickup Notification",
              text: "Requests will show when the chart is confirmed, being prepared, or ready for pickup.",
              icon: Hospital,
            },
            {
              title: "Return Tracking",
              text: "Borrowed physical charts will be tracked until Medical Records marks them returned.",
              icon: Clock,
            },
          ].map((item) => (
            <div key={item.title} className="mrs-card rounded-xl p-4">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <item.icon size={20} />
              </div>
              <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mrs-panel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Stethoscope size={20} />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-slate-900">Next V3 Module</p>
              <p className="text-xs font-semibold text-slate-600">
                Chart Transactions will connect over-the-counter borrowing and online chart requests in one workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
