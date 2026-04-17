import React from "react";

export default function Navbar() {
  return (
    <div className="w-full bg-white shadow px-6 py-4 flex justify-between items-center">

      <h2 className="text-green-700 font-bold text-lg">
        Admin Dashboard
      </h2>

      <div className="text-sm text-gray-500">
        Logged in as Admin
      </div>

    </div>
  );
}