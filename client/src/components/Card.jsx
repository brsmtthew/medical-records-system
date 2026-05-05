import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <section className={`mrs-card rounded-2xl p-4 ${className}`}>
      {children}
    </section>
  );
}
