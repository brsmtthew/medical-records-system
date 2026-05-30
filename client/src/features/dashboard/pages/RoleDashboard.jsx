import React, { Suspense, lazy } from "react";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";

const ClinicalDashboard = lazy(() => import("./ClinicalDashboard"));
const Dashboard = lazy(() => import("./Dashboard"));

function DashboardLoader() {
  return (
    <div className="mrs-shell flex min-h-full items-center justify-center p-4">
      <div className="mrs-surface flex items-center gap-3 rounded-xl px-5 py-4">
        <LoaderCircle className="size-5 animate-spin text-green-700" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Dashboard</p>
          <p className="mt-1 text-lg font-black uppercase text-slate-900">Preparing Workspace</p>
        </div>
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
