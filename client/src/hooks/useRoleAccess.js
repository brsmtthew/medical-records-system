import { useMemo } from "react";
import { useAuth } from "../context/useAuth";

export default function useRoleAccess(allowedRoles = []) {
  const { userRole, isAuthenticated } = useAuth();

  return useMemo(
    () => ({
      canAccess: isAuthenticated && (allowedRoles.length === 0 || allowedRoles.includes(userRole)),
      userRole,
    }),
    [allowedRoles, isAuthenticated, userRole],
  );
}
