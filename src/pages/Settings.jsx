import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  Bell,
  Check,
  Edit,
  FileText,
  MonitorCog,
  Plus,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  addDepartment,
  deleteDepartment,
  fallbackDepartments,
  subscribeToDepartments,
  updateDepartment,
} from "../services/firebaseRecords";

const tabs = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "charts", label: "Charts", icon: FileText },
  { id: "reports", label: "Reports", icon: SlidersHorizontal },
  { id: "appearance", label: "Display", icon: MonitorCog },
  { id: "security", label: "Security", icon: ShieldCheck },
];

const defaultSettings = {
  hospitalName: "Tagum Global Medical Center Inc.",
  email: "records@tgmci.local",
  hours: "8:00 AM - 5:00 PM",
  facilityCode: "TGMCI",

  caseFormat: "CN-YYYY-000",
  autoGenerate: true,
  maxBorrowDays: 3,
  allowMultipleBorrow: false,
  highlightOverdue: true,

  enableLogs: true,
  defaultFilter: "all",
  dailySummary: true,

  darkMode: false,
  compactTable: false,
  reduceMotion: false,

  confirmDelete: true,
  autoLogout: 15,
  requirePasswordForExport: true,
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 bg-slate-50 border-2 border-slate-100 hover:border-black rounded-2xl p-4 text-left transition-colors"
    >
      <span>
        <span className="block text-sm font-black text-slate-800">{label}</span>
        <span className="block text-xs font-semibold text-slate-500 mt-0.5">{description}</span>
      </span>
      <span
        className={`shrink-0 w-12 h-7 rounded-full border-2 border-black p-0.5 transition-colors ${
          checked ? "bg-green-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white border border-black transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(() => {
    const storedSettings = localStorage.getItem("mrs-settings");
    return storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
  });
  const [savedMessage, setSavedMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentError, setDepartmentError] = useState("");

  useEffect(() => {
    return subscribeToDepartments(
      setDepartments,
      (error) => setDepartmentError(error.message || "Unable to load departments from Firebase."),
    );
  }, []);

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabMeta.icon;

  const changedCount = useMemo(() => {
    return Object.keys(defaultSettings).filter((key) => defaultSettings[key] !== settings[key]).length;
  }, [settings]);

  const handleChange = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setSavedMessage("Settings restored to defaults.");
  };

  const saveSettings = () => {
    localStorage.setItem("mrs-settings", JSON.stringify(settings));
    setSavedMessage("Settings saved locally.");
  };

  const departmentExists = (name, ignoredId = "") => {
    return departments.some(
      (department) =>
        department.id !== ignoredId &&
        department.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  const handleAddDepartment = async (event) => {
    event.preventDefault();
    const name = departmentName.trim();
    if (!name) return;
    if (departmentExists(name)) {
      setDepartmentError("That department already exists.");
      return;
    }

    try {
      await addDepartment(name);
      setDepartmentName("");
      setDepartmentError("");
    } catch (error) {
      setDepartmentError(error.message || "Unable to add department.");
    }
  };

  const handleUpdateDepartment = async (event) => {
    event.preventDefault();
    const name = editingDepartment?.name.trim();
    if (!name) return;
    if (departmentExists(name, editingDepartment.id)) {
      setDepartmentError("That department already exists.");
      return;
    }

    try {
      await updateDepartment(editingDepartment.id, name);
      setEditingDepartment(null);
      setDepartmentError("");
    } catch (error) {
      setDepartmentError(error.message || "Unable to update department.");
    }
  };

  const handleDeleteDepartment = async (id) => {
    try {
      await deleteDepartment(id);
      setDepartmentError("");
    } catch (error) {
      setDepartmentError(error.message || "Unable to delete department.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              System <span className="text-green-700">Settings</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Configure chart rules, audit reports, display preferences, and record protection.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-black bg-white text-xs font-black uppercase hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={17} />
              Defaults
            </button>
            <button
              onClick={saveSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none transition-all"
            >
              <Save size={17} />
              Save Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white border-2 border-black rounded-2xl p-3 sticky top-24">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-colors ${
                      isActive
                        ? "bg-green-700 text-white"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6">
            <div className="bg-white border-2 border-black rounded-2xl overflow-hidden">
              <div className="p-5 border-b-2 border-black bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-100 text-green-700 border-2 border-black">
                    <ActiveIcon size={21} />
                  </div>
                  <div>
                    <h2 className="font-black uppercase text-slate-800">{activeTabMeta.label} Settings</h2>
                    <p className="text-xs font-bold text-slate-400">
                      {changedCount} unsaved change(s)
                    </p>
                  </div>
                </div>
                {savedMessage && (
                  <div className="px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs font-black">
                    {savedMessage}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {activeTab === "general" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Hospital Name">
                      <input
                        value={settings.hospitalName}
                        onChange={(e) => handleChange("hospitalName", e.target.value)}
                        className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </Field>
                    <Field label="Records Email">
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </Field>
                    <Field label="Operating Hours">
                      <input
                        value={settings.hours}
                        onChange={(e) => handleChange("hours", e.target.value)}
                        className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </Field>
                    <Field label="Facility Code">
                      <input
                        value={settings.facilityCode}
                        onChange={(e) => handleChange("facilityCode", e.target.value.toUpperCase())}
                        className="w-full border-2 border-black rounded-xl p-3 font-mono font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </Field>
                  </div>
                )}

                {activeTab === "charts" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Case Number Format">
                        <input
                          value={settings.caseFormat}
                          onChange={(e) => handleChange("caseFormat", e.target.value.toUpperCase())}
                          className="w-full border-2 border-black rounded-xl p-3 font-mono font-bold outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </Field>
                      <Field label="Max Borrow Days">
                        <input
                          type="number"
                          min="1"
                          value={settings.maxBorrowDays}
                          onChange={(e) => handleChange("maxBorrowDays", Number(e.target.value))}
                          className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </Field>
                    </div>
                    <Toggle
                      label="Auto-generate case numbers"
                      description="Use the configured format when registering new patients."
                      checked={settings.autoGenerate}
                      onChange={(value) => handleChange("autoGenerate", value)}
                    />
                    <Toggle
                      label="Allow multiple borrowers"
                      description="Permit more than one active borrower for the same chart."
                      checked={settings.allowMultipleBorrow}
                      onChange={(value) => handleChange("allowMultipleBorrow", value)}
                    />
                    <Toggle
                      label="Highlight overdue charts"
                      description="Mark records past the configured borrow period."
                      checked={settings.highlightOverdue}
                      onChange={(value) => handleChange("highlightOverdue", value)}
                    />

                    <div className="border-2 border-black rounded-2xl overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b-2 border-black">
                        <h3 className="font-black uppercase text-slate-800">Hospital Areas</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          These values appear in the Chart Tracking department dropdown.
                        </p>
                      </div>

                      <div className="p-4 space-y-4">
                        <form onSubmit={handleAddDepartment} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <input
                            value={departmentName}
                            onChange={(event) => {
                              setDepartmentName(event.target.value);
                              setDepartmentError("");
                            }}
                            placeholder="Add hospital area"
                            className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase"
                          >
                            <Plus size={16} />
                            Add
                          </button>
                        </form>

                        {departmentError && (
                          <div className="border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                            {departmentError}
                          </div>
                        )}

                        <div className="space-y-2">
                          {departments.map((department) => (
                            <div
                              key={department.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-2 border-slate-100 rounded-xl p-3"
                            >
                              {editingDepartment?.id === department.id ? (
                                <form onSubmit={handleUpdateDepartment} className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                  <input
                                    value={editingDepartment.name}
                                    onChange={(event) => setEditingDepartment({ ...editingDepartment, name: event.target.value })}
                                    className="w-full border-2 border-black rounded-xl p-2 font-bold outline-none focus:ring-2 focus:ring-green-500"
                                  />
                                  <button type="submit" className="inline-flex items-center justify-center p-2 rounded-xl bg-green-700 text-white">
                                    <Check size={18} />
                                  </button>
                                  <button type="button" onClick={() => setEditingDepartment(null)} className="inline-flex items-center justify-center p-2 rounded-xl border-2 border-slate-200 text-slate-500">
                                    <X size={18} />
                                  </button>
                                </form>
                              ) : (
                                <>
                                  <p className="font-black text-slate-800">{department.name}</p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDepartment(department)}
                                      className="p-2 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-black hover:text-black"
                                      aria-label={`Edit ${department.name}`}
                                    >
                                      <Edit size={17} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDepartment(department.id)}
                                      className="p-2 rounded-xl border-2 border-red-100 text-red-500 hover:border-red-300"
                                      aria-label={`Delete ${department.name}`}
                                    >
                                      <Trash2 size={17} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {departments.length === 0 && (
                            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                              <p className="text-sm font-black text-slate-700">No Firebase departments yet.</p>
                              <p className="text-xs font-semibold text-slate-500 mt-1">
                                Chart Tracking will temporarily use: {fallbackDepartments.join(", ")}.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "reports" && (
                  <div className="space-y-4">
                    <Toggle
                      label="Enable audit logs"
                      description="Track chart circulation and report activity."
                      checked={settings.enableLogs}
                      onChange={(value) => handleChange("enableLogs", value)}
                    />
                    <Toggle
                      label="Daily summary notification"
                      description="Show daily chart movement summaries in the navbar."
                      checked={settings.dailySummary}
                      onChange={(value) => handleChange("dailySummary", value)}
                    />
                    <Field label="Default Report Filter">
                      <select
                        value={settings.defaultFilter}
                        onChange={(e) => handleChange("defaultFilter", e.target.value)}
                        className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none bg-white focus:ring-2 focus:ring-green-500"
                      >
                        <option value="all">All Records</option>
                        <option value="borrowed">Borrowed</option>
                        <option value="returned">Returned</option>
                      </select>
                    </Field>
                  </div>
                )}

                {activeTab === "appearance" && (
                  <div className="space-y-4">
                    <Toggle
                      label="Dark mode preference"
                      description="Store a display preference for future theme support."
                      checked={settings.darkMode}
                      onChange={(value) => handleChange("darkMode", value)}
                    />
                    <Toggle
                      label="Compact table rows"
                      description="Reduce table spacing for dense records work."
                      checked={settings.compactTable}
                      onChange={(value) => handleChange("compactTable", value)}
                    />
                    <Toggle
                      label="Reduce motion"
                      description="Limit animations in page transitions and modal dialogs."
                      checked={settings.reduceMotion}
                      onChange={(value) => handleChange("reduceMotion", value)}
                    />
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-4">
                    <Field label="Auto Logout Minutes">
                      <input
                        type="number"
                        min="1"
                        value={settings.autoLogout}
                        onChange={(e) => handleChange("autoLogout", Number(e.target.value))}
                        className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </Field>
                    <Toggle
                      label="Confirm destructive actions"
                      description="Ask before deleting patient records or chart logs."
                      checked={settings.confirmDelete}
                      onChange={(value) => handleChange("confirmDelete", value)}
                    />
                    <Toggle
                      label="Require password for exports"
                      description="Protect CSV exports and audit log downloads."
                      checked={settings.requirePasswordForExport}
                      onChange={(value) => handleChange("requirePasswordForExport", value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Audit Logging", value: settings.enableLogs ? "Enabled" : "Disabled", icon: Bell },
                { label: "Borrow Period", value: `${settings.maxBorrowDays} days`, icon: FileText },
                { label: "Session Timeout", value: `${settings.autoLogout} min`, icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="bg-white border-2 border-black rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-green-50 text-green-700 border border-green-100">
                      <item.icon size={19} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">{item.label}</p>
                      <p className="font-black text-slate-800">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
