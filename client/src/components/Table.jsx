import React from "react";

export default function Table({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-separate border-spacing-y-2">{children}</table>
    </div>
  );
}
