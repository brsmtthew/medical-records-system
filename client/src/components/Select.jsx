import React from "react";

export default function Select({ children, className = "", label, ...props }) {
  const control = (
    <select
      className={`mrs-field w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-bold ${className}`}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) return control;

  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {control}
    </label>
  );
}
