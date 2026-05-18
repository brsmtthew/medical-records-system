import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Patients = lazy(() => import("../pages/Patients"));
const Charts = lazy(() => import("../pages/Charts"));
const Reports = lazy(() => import("../pages/Reports"));
const Settings = lazy(() => import("../pages/Settings"));
const ChartViewing = lazy(() => import("../pages/ChartViewing"));
const Users = lazy(() => import("../pages/Users"));
const MedicalDocuments = lazy(() => import("../pages/MedicalDocuments"));
const LabResults = lazy(() => import("../pages/LabResults"));
const VitalCertificates = lazy(() => import("../pages/VitalCertificates"));
const TrackingReports = lazy(() => import("../pages/TrackingReports"));
const PrintReports = lazy(() => import("../pages/PrintReports"));

function RouteLoader() {
  return (
    <div className="mrs-shell flex min-h-dvh items-center justify-center p-4 font-sans">
      <div className="mrs-surface rounded-xl px-5 py-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Workspace</p>
        <p className="mt-1 text-lg font-black uppercase text-slate-900">TGMCI Records</p>
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
            <ProtectedRoute roles={["admin", "staff"]}>
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
          path="/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Users />
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
        <Route
          path="/chartviewing"
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
