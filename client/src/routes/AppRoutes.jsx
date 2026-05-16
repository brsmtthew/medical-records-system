import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Patients from "../pages/Patients";
import Charts from "../pages/Charts";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import ChartViewing from "../pages/ChartViewing";
import Users from "../pages/Users";
import MedicalDocuments from "../pages/MedicalDocuments";
import LabResults from "../pages/LabResults";
import VitalCertificates from "../pages/VitalCertificates";
import TrackingReports from "../pages/TrackingReports";
import PrintReports from "../pages/PrintReports";

export default function AppRoutes() {
  return (
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
    </Routes>
  );
}
