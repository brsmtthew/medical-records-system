import React from "react";
import { CircleAlert, Info } from "lucide-react";

const tones = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function AlertMessage({ children, tone = "info" }) {
  const Icon = tone === "error" || tone === "warning" ? CircleAlert : Info;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-semibold ${tones[tone] || tones.info}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
