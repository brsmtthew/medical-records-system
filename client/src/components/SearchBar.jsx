import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({ className = "", onChange, value, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        className="mrs-field w-full rounded-xl py-3 pl-12 pr-4 text-sm font-bold"
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
}
