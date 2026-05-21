import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { AuthContext } from "./useAuth";
import { auth, db, invalidFirebaseConfig, missingFirebaseConfig } from "@/firebaseClient";
import { syncActiveUserProfile } from "@services/recordsService";
import { isMedicalRecordsRole, normalizeUserRole, userRoles } from "@shared/constants/userRoles";

function isUnavailableAccount(status) {
  return ["deleted", "missing"].includes(status);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Tracks Firebase Auth state and hydrates the matching user security profile.
    if (!auth) {
      syncActiveUserProfile(null);
      return undefined;
    }

    let unsubscribeProfile = () => {};

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();
      setCurrentUser(user);
      setUserProfile(null);
      syncActiveUserProfile(null);

      if (!user) {
        setAuthLoading(false);
        return;
      }

      if (!db) {
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      const userRef = doc(db, "users", user.uid);
      unsubscribeProfile = onSnapshot(
        userRef,
        (snapshot) => {
          const fallbackProfile = {
            uid: user.uid,
            fullName: user.displayName || "",
            email: user.email || "",
            role: "staff",
            accountStatus: "active",
            department: "Medical Records",
            clinic: "",
            specialty: "",
            licenseNumber: "",
          };

          if (!snapshot.exists()) {
            const missingProfile = {
              ...fallbackProfile,
              accountStatus: "missing",
            };
            setUserProfile(missingProfile);
            syncActiveUserProfile(missingProfile);
          } else {
            const profile = {
              ...fallbackProfile,
              ...snapshot.data(),
            };
            setUserProfile(profile);
            syncActiveUserProfile(profile);
          }
          setAuthLoading(false);
        },
        (error) => {
          console.error("Unable to load user security profile:", error);
          const fallbackProfile = {
            uid: user.uid,
            fullName: user.displayName || "",
            email: user.email || "",
            role: "",
            accountStatus: "missing",
            department: "",
          };
          setUserProfile(fallbackProfile);
          syncActiveUserProfile(fallbackProfile);
          setAuthLoading(false);
        },
      );
    });

    return () => {
      unsubscribeProfile();
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      userRole: normalizeUserRole(userProfile?.role),
      isAdmin: normalizeUserRole(userProfile?.role) === userRoles.admin,
      isStaff: normalizeUserRole(userProfile?.role) === userRoles.staff,
      isNurse: normalizeUserRole(userProfile?.role) === userRoles.nurse,
      isDoctor: normalizeUserRole(userProfile?.role) === userRoles.doctor,
      isMedicalRecordsUser: isMedicalRecordsRole(userProfile?.role),
      isAccountDisabled: userProfile?.accountStatus === "disabled" || isUnavailableAccount(userProfile?.accountStatus),
      authLoading,
      isAuthenticated: Boolean(currentUser),
      missingFirebaseConfig,
      invalidFirebaseConfig,
    }),
    [authLoading, currentUser, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
