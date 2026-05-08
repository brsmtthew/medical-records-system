import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { AuthContext } from "./useAuth";
import { auth, db, invalidFirebaseConfig, missingFirebaseConfig } from "../firebaseClient";

function normalizeRole(role) {
  return role === "admin" ? "admin" : "staff";
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Tracks Firebase Auth state and hydrates the matching user security profile.
    if (!auth) {
      return undefined;
    }

    let unsubscribeProfile = () => {};

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();
      setCurrentUser(user);
      setUserProfile(null);

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
          };

          if (!snapshot.exists()) {
            setDoc(
              userRef,
              {
                ...fallbackProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            ).catch(console.error);
            setUserProfile(fallbackProfile);
          } else {
            setUserProfile({
              ...fallbackProfile,
              ...snapshot.data(),
            });
          }
          setAuthLoading(false);
        },
        (error) => {
          console.error("Unable to load user security profile:", error);
          setUserProfile({
            uid: user.uid,
            fullName: user.displayName || "",
            email: user.email || "",
            role: "staff",
            accountStatus: "active",
            department: "Medical Records",
          });
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
      userRole: normalizeRole(userProfile?.role),
      isAdmin: normalizeRole(userProfile?.role) === "admin",
      isStaff: normalizeRole(userProfile?.role) === "staff",
      isAccountDisabled: userProfile?.accountStatus === "disabled",
      authLoading,
      isAuthenticated: Boolean(currentUser),
      missingFirebaseConfig,
      invalidFirebaseConfig,
    }),
    [authLoading, currentUser, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
