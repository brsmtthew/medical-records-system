import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../features/auth/pages/Login"));
const Dashboard = lazy(() => import("../features/dashboard/pages/RoleDashboard"));
const Patients = lazy(() => import("../features/patients/pages/Patients"));
const Charts = lazy(() => import("../features/charts/pages/Charts"));
const Reports = lazy(() => import("../features/reports/pages/Reports"));
const Settings = lazy(() => import("../features/settings/pages/Settings"));
const ClinicalSettings = lazy(() => import("../features/settings/pages/ClinicalSettings"));
const ChartViewing = lazy(() => import("../features/charts/pages/ChartViewing"));
const ChartRequests = lazy(() => import("../features/charts/pages/ChartRequests"));
const ChartReturns = lazy(() => import("../features/charts/pages/ChartReturns"));
const Users = lazy(() => import("../features/users/pages/Users"));
const MedicalDocuments = lazy(() => import("../features/tracking/pages/MedicalDocuments"));
const LabResults = lazy(() => import("../features/tracking/pages/LabResults"));
const VitalCertificates = lazy(() => import("../features/tracking/pages/VitalCertificates"));
const TrackingReports = lazy(() => import("../features/tracking/pages/TrackingReports"));
const PrintReports = lazy(() => import("../features/reports/pages/PrintReports"));

function RouteLoader() {
  return (
    <div className="mrs-shell flex min-h-dvh items-center justify-center p-4 font-sans">
      <div className="mrs-surface flex items-center gap-3 rounded-xl px-5 py-4">
        <LoaderCircle className="size-5 animate-spin text-green-700" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Workspace</p>
        <p className="mt-1 text-lg font-black uppercase text-slate-900">TGMCI Records</p>
        </div>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/patients"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/charts"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Charts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["admin", "staff", "nurse", "doctor"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-documents"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <MedicalDocuments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab-results"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <LabResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vital-certificates"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <VitalCertificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tracking-reports"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <TrackingReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/print-reports"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <PrintReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinical-settings"
          element={
            <ProtectedRoute roles={["nurse", "doctor"]}>
              <ClinicalSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chart-requests"
          element={
            <ProtectedRoute roles={["admin", "staff", "nurse", "doctor"]}>
              <ChartRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chart-return"
          element={
            <ProtectedRoute roles={["nurse", "doctor"]}>
              <ChartReturns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chart-viewing"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <ChartViewing />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
