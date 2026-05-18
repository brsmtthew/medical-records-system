import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/useAuth";
import { auth } from "../firebaseClient";
import { cancelAutoLogout, scheduleAutoLogout } from "../services/sessionService";
import { readSystemSettings } from "../utils/systemSettings";

export default function ProtectedRoute({ children, requireAdmin = false, roles = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastActivityRef = useRef(0);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(() => {
    return localStorage.getItem("mrs-confidentiality-ack") === "true";
  });
  const { authLoading, isAuthenticated, isAccountDisabled, isAdmin, userRole } = useAuth();

  useEffect(() => {
    // Locks inactive protected routes using the workstation timeout from Settings.
    if (!isAuthenticated || !auth) return undefined;

    const settings = readSystemSettings();
    const timeoutMinutes = Math.min(60, Math.max(5, Number(settings.sessionTimeoutMinutes) || 10));
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = Math.min(60 * 1000, timeoutMs / 2);
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      setSessionWarning((isVisible) => (isVisible ? false : isVisible));
    };
    // Checks inactivity on an interval so passive users are signed out.
    const checkActivity = async () => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= timeoutMs - warningMs && idleMs < timeoutMs) {
        setSessionWarning(true);
        return;
      }
      if (idleMs < timeoutMs) return;
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
    const interval = window.setInterval(checkActivity, 15000);

    return () => {
      ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
        window.removeEventListener(eventName, resetActivity);
      });
      window.clearInterval(interval);
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      cancelAutoLogout();
      return undefined;
    }

    // Keeps legacy backend-token sessions from outliving their JWT expiry.
    scheduleAutoLogout(() => {
      if (auth) signOut(auth).catch(() => {});
      navigate("/", {
        replace: true,
        state: {
          securityMessage: "Session expired. Please sign in again.",
        },
      });
    });

    return () => cancelAutoLogout();
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

  const isMissingRequiredRole = roles.length > 0 && !roles.includes(userRole);

  if ((requireAdmin && !isAdmin) || isMissingRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      {children}
      {!privacyAcknowledged && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="mrs-panel w-full max-w-lg rounded-2xl p-6">
            <p className="text-lg font-black uppercase text-slate-800">Confidential Records Access</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Patient information is confidential. Continue only when access is work-related, authorized, and compliant with hospital privacy policy and the Data Privacy Act.
            </p>
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-bold leading-relaxed text-green-800">
              Local chart viewing files stay on this workstation and are not uploaded by the chart viewing page.
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("mrs-confidentiality-ack", "true");
                setPrivacyAcknowledged(true);
              }}
              className="mrs-primary-button mt-5 w-full rounded-xl px-4 py-3 text-xs font-black uppercase"
            >
              I Understand And Accept
            </button>
          </div>
        </div>
      )}
      {sessionWarning && (
        <div className="fixed bottom-4 right-4 z-[130] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-amber-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
          <p className="text-sm font-black uppercase text-slate-800">Session Expiring Soon</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Activity has been idle. Continue working to keep this secure session open.
          </p>
          <button
            type="button"
            onClick={() => {
              lastActivityRef.current = Date.now();
              setSessionWarning(false);
            }}
            className="mrs-primary-button mt-3 rounded-lg px-4 py-2 text-xs font-black uppercase"
          >
            Stay Signed In
          </button>
        </div>
      )}
    </>
  );
}
