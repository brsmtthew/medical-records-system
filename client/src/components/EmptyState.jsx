import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ description, icon: EmptyIcon = Inbox, title = "No records found" }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div>
        {React.createElement(EmptyIcon, { size: 34, className: "mx-auto mb-3 text-slate-300" })}
        <p className="font-bold uppercase text-slate-700">{title}</p>
        {description && <p className="mt-1 text-sm font-medium text-slate-400">{description}</p>}
      </div>
    </div>
  );
}
