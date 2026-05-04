import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Reads the current auth/session profile and fails clearly when used outside AuthProvider.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
