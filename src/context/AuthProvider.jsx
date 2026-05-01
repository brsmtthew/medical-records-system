import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AuthContext } from "./useAuth";
import { auth, missingFirebaseConfig } from "../firebase";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      authLoading,
      isAuthenticated: Boolean(currentUser),
      missingFirebaseConfig,
    }),
    [authLoading, currentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
