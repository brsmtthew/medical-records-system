import React from "react";

import { useAuth } from "@features/auth/context/useAuth";
import { isMedicalRecordsRole } from "@shared/constants/userRoles";
import ClinicalDashboard from "./ClinicalDashboard";
import Dashboard from "./Dashboard";

export default function RoleDashboard() {
  const { userRole } = useAuth();

  return isMedicalRecordsRole(userRole) ? <Dashboard /> : <ClinicalDashboard />;
}
