import React from "react";

const variants = {
  primary: "mrs-primary-button",
  secondary: "mrs-soft-button",
  blue: "mrs-blue-button",
  danger: "bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700",
  ghost: "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
};

export default function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase transition-all disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
