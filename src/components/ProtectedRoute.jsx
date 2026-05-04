import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/useAuth";
import { auth } from "../firebaseClient";
import { readSystemSettings } from "../utils/systemSettings";
import { defaultSessionTimeoutMinutes } from "../utils/security";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastActivityRef = useRef(0);
  const { authLoading, isAuthenticated, isAccountDisabled } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !auth) return undefined;

    const timeoutMinutes = Number(readSystemSettings().sessionTimeoutMinutes) || defaultSessionTimeoutMinutes;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const checkActivity = async () => {
      if (Date.now() - lastActivityRef.current < timeoutMs) return;
      await signOut(auth);
      navigate("/", {
        replace: true,
        state: {
          securityMessage: "Session locked after inactivity. Please sign in again.",
        },
      });
    };

    resetActivity();
    ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
      window.addEventListener(eventName, resetActivity, { passive: true });
    });
    const interval = window.setInterval(checkActivity, 30000);

    return () => {
      ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
        window.removeEventListener(eventName, resetActivity);
      });
      window.clearInterval(interval);
    };
  }, [isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="mrs-shell min-h-screen flex items-center justify-center font-sans">
        <div className="mrs-surface rounded-2xl px-6 py-5">
          <p className="text-sm font-black uppercase text-slate-800">Checking Access</p>
          <p className="text-xs font-bold text-slate-400 mt-1">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (isAccountDisabled) {
    return (
      <div className="mrs-shell min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="mrs-panel max-w-sm rounded-2xl p-6 text-center">
          <p className="text-xl font-black uppercase text-slate-800">Account Disabled</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            This account has been blocked from accessing medical records. Contact the records head.
          </p>
          <button
            type="button"
            onClick={() => auth && signOut(auth)}
            className="mrs-primary-button mt-6 rounded-xl px-5 py-3 text-xs font-black uppercase"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return children;
}
