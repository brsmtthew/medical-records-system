import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import AdminDashboard from "./pages/AdminDashboard";
import Patients from "./pages/Patients";
import Charts from "./pages/Charts";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ChartViewing from "./pages/ChartViewing"; 

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chart-viewing" element={<ChartViewing />} />
        <Route path="/chartviewing" element={<ChartViewing />} />
      </Routes>
    </Router>
  );
}
