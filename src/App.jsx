import React, { useLayoutEffect } from "react";
import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Charts from "./pages/Charts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ChartViewing from "./pages/ChartViewing"; 
import { readSystemSettings } from "./utils/systemSettings";

export default function App() {
  useLayoutEffect(() => {
    const applyTheme = () => {
      const { appearanceMode, lightComfortMode } = readSystemSettings();
      document.documentElement.classList.toggle("dark", appearanceMode === "dark");
      document.documentElement.classList.toggle(
        "soft-light",
        appearanceMode !== "dark" && lightComfortMode === "soft",
      );
    };

    applyTheme();
    window.addEventListener("storage", applyTheme);
    window.addEventListener("mrs-settings-updated", applyTheme);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("mrs-settings-updated", applyTheme);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
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
              <ProtectedRoute>
                <Patients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charts"
            element={
              <ProtectedRoute>
                <Charts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chart-viewing"
            element={
              <ProtectedRoute>
                <ChartViewing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chartviewing"
            element={
              <ProtectedRoute>
                <ChartViewing />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
