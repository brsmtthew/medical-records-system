import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  // -------------------------
  // STATES
  // -------------------------
  const [settings, setSettings] = useState({
    hospitalName: "My Clinic",
    email: "",
    hours: "8:00 AM - 5:00 PM",

    caseFormat: "CN-001",
    autoGenerate: true,

    maxBorrowDays: 3,
    allowMultipleBorrow: false,
    highlightOverdue: true,

    enableLogs: true,
    defaultFilter: "all",

    darkMode: false,
    compactTable: false,

    confirmDelete: true,
    autoLogout: 5,
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl">

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* TABS */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: "general", label: "General" },
            { id: "charts", label: "Charts" },
            { id: "reports", label: "Reports" },
            { id: "appearance", label: "Appearance" },
            { id: "security", label: "Security" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded ${
                activeTab === tab.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------------- GENERAL ---------------- */}
        {activeTab === "general" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Hospital Info</h2>

            <input
              type="text"
              value={settings.hospitalName}
              onChange={(e) => handleChange("hospitalName", e.target.value)}
              placeholder="Hospital Name"
              className="border p-2 w-full mb-3"
            />

            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Email"
              className="border p-2 w-full mb-3"
            />

            <input
              type="text"
              value={settings.hours}
              onChange={(e) => handleChange("hours", e.target.value)}
              placeholder="Operating Hours"
              className="border p-2 w-full"
            />
          </div>
        )}

        {/* ---------------- CHART SETTINGS ---------------- */}
        {activeTab === "charts" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Chart Settings</h2>

            <input
              type="text"
              value={settings.caseFormat}
              onChange={(e) => handleChange("caseFormat", e.target.value)}
              className="border p-2 w-full mb-3"
              placeholder="Case Number Format"
            />

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={settings.autoGenerate}
                onChange={(e) => handleChange("autoGenerate", e.target.checked)}
              />
              Auto-generate Case Number
            </label>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={settings.allowMultipleBorrow}
                onChange={(e) =>
                  handleChange("allowMultipleBorrow", e.target.checked)
                }
              />
              Allow multiple borrow per chart
            </label>
          </div>
        )}

        {/* ---------------- BORROW RULES ---------------- */}
        {activeTab === "charts" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Borrowing Rules</h2>

            <input
              type="number"
              value={settings.maxBorrowDays}
              onChange={(e) =>
                handleChange("maxBorrowDays", e.target.value)
              }
              className="border p-2 w-full mb-3"
              placeholder="Max Borrow Days"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.highlightOverdue}
                onChange={(e) =>
                  handleChange("highlightOverdue", e.target.checked)
                }
              />
              Highlight overdue charts
            </label>
          </div>
        )}

        {/* ---------------- REPORTS ---------------- */}
        {activeTab === "reports" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Reports Settings</h2>

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={settings.enableLogs}
                onChange={(e) => handleChange("enableLogs", e.target.checked)}
              />
              Enable logging
            </label>

            <select
              value={settings.defaultFilter}
              onChange={(e) =>
                handleChange("defaultFilter", e.target.value)
              }
              className="border p-2 w-full"
            >
              <option value="all">Default: All</option>
              <option value="borrowed">Borrowed</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        )}

        {/* ---------------- APPEARANCE ---------------- */}
        {activeTab === "appearance" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Appearance</h2>

            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => handleChange("darkMode", e.target.checked)}
              />
              Dark Mode
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.compactTable}
                onChange={(e) =>
                  handleChange("compactTable", e.target.checked)
                }
              />
              Compact Table
            </label>
          </div>
        )}

        {/* ---------------- SECURITY ---------------- */}
        {activeTab === "security" && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4">Security</h2>

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={settings.confirmDelete}
                onChange={(e) =>
                  handleChange("confirmDelete", e.target.checked)
                }
              />
              Confirm before delete
            </label>

            <input
              type="number"
              value={settings.autoLogout}
              onChange={(e) =>
                handleChange("autoLogout", e.target.value)
              }
              className="border p-2 w-full"
              placeholder="Auto logout (minutes)"
            />
          </div>
        )}

        {/* SAVE BUTTON */}
        <button
          onClick={() => alert("Settings saved (local only)")}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Save Settings
        </button>

      </div>
    </DashboardLayout>
  );
}