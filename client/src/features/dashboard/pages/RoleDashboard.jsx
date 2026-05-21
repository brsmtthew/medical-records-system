import React, { Suspense, lazy } from "react";

import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";

const ClinicalDashboard = lazy(() => import("./ClinicalDashboard"));
const Dashboard = lazy(() => import("./Dashboard"));

function DashboardLoader() {
  return (
    <div className="mrs-shell flex min-h-full items-center justify-center p-4">
      <div className="mrs-surface rounded-xl px-5 py-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Dashboard</p>
        <p className="mt-1 text-lg font-black uppercase text-slate-900">Preparing Workspace</p>
      </div>
    </div>
  );
}

export default function RoleDashboard() {
  const { userRole } = useAuth();

  return (
    <Suspense fallback={<DashboardLoader />}>
      {isMedicalRecordsRole(userRole) ? <Dashboard /> : <ClinicalDashboard />}
    </Suspense>
  );
}
