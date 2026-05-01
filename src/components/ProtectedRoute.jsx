import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="bg-white border-2 border-black rounded-2xl px-6 py-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          <p className="text-sm font-black uppercase text-slate-800">Checking Access</p>
          <p className="text-xs font-bold text-slate-400 mt-1">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
