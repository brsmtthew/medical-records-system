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
