import React from "react";

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-green-800 text-white p-6">

      <h1 className="text-2xl font-bold mb-8">
        TGMCI System
      </h1>

      <nav className="space-y-3 text-sm">

        <p className="p-2 hover:bg-green-700 rounded cursor-pointer">
          Dashboard
        </p>

        <p className="p-2 hover:bg-green-700 rounded cursor-pointer">
          Patients
        </p>

        <p className="p-2 hover:bg-green-700 rounded cursor-pointer">
          Charts (Borrow/Return)
        </p>

        <p className="p-2 hover:bg-green-700 rounded cursor-pointer">
          Reports
        </p>

        <p className="p-2 hover:bg-green-700 rounded cursor-pointer">
          Settings
        </p>

      </nav>

    </div>
  );
}