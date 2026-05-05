import React from "react";

export default function Input({ className = "", label, ...props }) {
  const control = (
    <input
      className={`mrs-field w-full rounded-xl px-4 py-3 text-sm font-bold ${className}`}
      {...props}
    />
  );

  if (!label) return control;

  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {control}
    </label>
  );
}
