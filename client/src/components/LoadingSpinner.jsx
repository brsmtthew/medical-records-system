import React from "react";

export default function LoadingSpinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-green-700" />
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}
