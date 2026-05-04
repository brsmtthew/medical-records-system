import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import {
  Bell,
  Building2,
  Check,
  Edit,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  addAdmissionLocation,
  addDepartment,
  addOutpatientDepartment,
  deleteAdmissionLocation,
  deleteDepartment,
  deleteOutpatientDepartment,
  fallbackAdmissionLocations,
  fallbackDepartments,
  fallbackOutpatientDepartments,
  subscribeToAdmissionLocations,
  subscribeToDepartments,
  subscribeToOutpatientDepartments,
  updateAdmissionLocation,
  updateDepartment,
  updateOutpatientDepartment,
} from "../services/recordsService";
import {
  defaultSystemSettings,
  readSystemSettings,
  saveSystemSettings,
} from "../utils/systemSettings";
import {
  normalizeNotification,
  readStoredNotifications,
  writeStoredNotifications,
  writeStoredUnreadNotifications,
} from "../utils/notificationLog";

const tabs = [
  { id: "rules", label: "System Settings", icon: SettingsIcon },
  { id: "departmentEditor", label: "Department Editor", icon: Building2 },
  { id: "notifications", label: "Notification Action Log", icon: Bell },
];

const departmentEditorSections = [
  { id: "departments", label: "Borrowing Departments" },
  { id: "admissions", label: "Admission Departments" },
  { id: "outpatients", label: "Outpatient Departments" },
];

function formatLogTimestamp(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs font-semibold text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("rules");
  const [departmentEditorTab, setDepartmentEditorTab] = useState("departments");
  const [settings, setSettings] = useState(readSystemSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentError, setDepartmentError] = useState("");
  const [admissionLocations, setAdmissionLocations] = useState([]);
  const [admissionLocationName, setAdmissionLocationName] = useState("");
  const [editingAdmissionLocation, setEditingAdmissionLocation] = useState(null);
  const [admissionLocationError, setAdmissionLocationError] = useState("");
  const [outpatientDepartments, setOutpatientDepartments] = useState([]);
  const [outpatientDepartmentName, setOutpatientDepartmentName] = useState("");
  const [editingOutpatientDepartment, setEditingOutpatientDepartment] = useState(null);
  const [outpatientDepartmentError, setOutpatientDepartmentError] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState(readStoredNotifications);

  useEffect(() => {
    const unsubscribeDepartments = subscribeToDepartments(
      setDepartments,
      (error) => setDepartmentError(error.message || "Unable to load departments from Firebase."),
    );

    const unsubscribeAdmissionLocations = subscribeToAdmissionLocations(
      setAdmissionLocations,
      (error) => setAdmissionLocationError(error.message || "Unable to load admission locations from Firebase."),
    );

    const unsubscribeOutpatientDepartments = subscribeToOutpatientDepartments(
      setOutpatientDepartments,
      (error) => setOutpatientDepartmentError(error.message || "Unable to load outpatient departments from Firebase."),
    );

    return () => {
      unsubscribeDepartments();
      unsubscribeAdmissionLocations();
      unsubscribeOutpatientDepartments();
    };
  }, []);

  useEffect(() => {
    const handleToastLog = (event) => {
      const notification = normalizeNotification(event.detail || {});
      if (!notification.message) return;
      setNotificationLogs((current) => [notification, ...current].slice(0, 50));
    };
    const handleNotificationsCleared = (event) => {
      if (event.detail?.scope === "notification-log") {
        setNotificationLogs([]);
      }
    };

    window.addEventListener("mrs-toast", handleToastLog);
    window.addEventListener("mrs-notifications-cleared", handleNotificationsCleared);
    return () => {
      window.removeEventListener("mrs-toast", handleToastLog);
      window.removeEventListener("mrs-notifications-cleared", handleNotificationsCleared);
    };
  }, []);

  useEffect(() => {
    writeStoredNotifications(notificationLogs);
  }, [notificationLogs]);

  const clearNotificationLogs = () => {
    setNotificationLogs([]);
    writeStoredNotifications([]);
    writeStoredUnreadNotifications(0);
    window.dispatchEvent(new CustomEvent("mrs-notifications-cleared", {
      detail: { scope: "notification-log" },
    }));
  };

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabMeta.icon;

  const handleChange = (key, value) => {
    setSettings((current) => {
      const nextSettings = { ...current, [key]: value };
      if (key === "appearanceMode" || key === "lightComfortMode") {
        saveSystemSettings(nextSettings);
        window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
      }
      return nextSettings;
    });
    setSavedMessage("");
    setSuccessMessage("");
    if (key === "appearanceMode" || key === "lightComfortMode") {
      const nextSettings = { ...settings, [key]: value };
      document.documentElement.classList.toggle("dark", nextSettings.appearanceMode === "dark");
      document.documentElement.classList.toggle(
        "soft-light",
        nextSettings.appearanceMode !== "dark" && nextSettings.lightComfortMode === "soft",
      );
    }
  };

  const resetSettings = () => {
    setSettings(defaultSystemSettings);
    saveSystemSettings(defaultSystemSettings);
    document.documentElement.classList.toggle("dark", defaultSystemSettings.appearanceMode === "dark");
    document.documentElement.classList.toggle(
      "soft-light",
      defaultSystemSettings.appearanceMode !== "dark" && defaultSystemSettings.lightComfortMode === "soft",
    );
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
    setSavedMessage("Settings restored to defaults.");
    setIsResetConfirmOpen(false);
  };

  const saveSettings = () => {
    const cleanedSettings = {
      ...settings,
      reportExportFileName: settings.reportExportFileName.trim() || "chart-activity-report",
      sessionTimeoutMinutes: Math.min(
        240,
        Math.max(5, Number(settings.sessionTimeoutMinutes) || defaultSystemSettings.sessionTimeoutMinutes),
      ),
    };
    setSettings(cleanedSettings);
    saveSystemSettings(cleanedSettings);
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
    setSavedMessage("Settings saved.");
  };

  const departmentExists = (name, ignoredId = "") => {
    return departments.some(
      (department) =>
        department.id !== ignoredId &&
        department.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  const admissionLocationExists = (name, ignoredId = "") => {
    return admissionLocations.some(
      (location) =>
        location.id !== ignoredId &&
        location.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  const outpatientDepartmentExists = (name, ignoredId = "") => {
    return outpatientDepartments.some(
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
      setSuccessMessage(`${name} was added to borrowing departments.`);
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
      setSuccessMessage(`${name} was updated in borrowing departments.`);
    } catch (error) {
      setDepartmentError(error.message || "Unable to update department.");
    }
  };

  const handleDeleteDepartment = async (id) => {
    const departmentName = departments.find((department) => department.id === id)?.name || "Department";
    try {
      await deleteDepartment(id);
      setDepartmentError("");
      setSuccessMessage(`${departmentName} was deleted from borrowing departments.`);
    } catch (error) {
      setDepartmentError(error.message || "Unable to delete department.");
    }
  };

  const handleAddAdmissionLocation = async (event) => {
    event.preventDefault();
    const name = admissionLocationName.trim();
    if (!name) return;
    if (admissionLocationExists(name)) {
      setAdmissionLocationError("That admission location already exists.");
      return;
    }

    try {
      await addAdmissionLocation(name);
      setAdmissionLocationName("");
      setAdmissionLocationError("");
      setSuccessMessage(`${name} was added to admission locations.`);
    } catch (error) {
      setAdmissionLocationError(error.message || "Unable to add admission location. Check Firebase write permission for departments.");
    }
  };

  const handleUpdateAdmissionLocation = async (event) => {
    event.preventDefault();
    const name = editingAdmissionLocation?.name.trim();
    if (!name) return;
    if (admissionLocationExists(name, editingAdmissionLocation.id)) {
      setAdmissionLocationError("That admission location already exists.");
      return;
    }

    try {
      await updateAdmissionLocation(editingAdmissionLocation.id, name);
      setEditingAdmissionLocation(null);
      setAdmissionLocationError("");
      setSuccessMessage(`${name} was updated in admission locations.`);
    } catch (error) {
      setAdmissionLocationError(error.message || "Unable to update admission location. Check Firebase write permission for departments.");
    }
  };

  const handleDeleteAdmissionLocation = async (id) => {
    const locationName = admissionLocations.find((location) => location.id === id)?.name || "Admission location";
    try {
      await deleteAdmissionLocation(id);
      setAdmissionLocationError("");
      setSuccessMessage(`${locationName} was deleted from admission locations.`);
    } catch (error) {
      setAdmissionLocationError(error.message || "Unable to delete admission location. Check Firebase write permission for departments.");
    }
  };

  const handleAddOutpatientDepartment = async (event) => {
    event.preventDefault();
    const name = outpatientDepartmentName.trim();
    if (!name) return;
    if (outpatientDepartmentExists(name)) {
      setOutpatientDepartmentError("That outpatient department already exists.");
      return;
    }

    try {
      await addOutpatientDepartment(name);
      setOutpatientDepartmentName("");
      setOutpatientDepartmentError("");
      setSuccessMessage(`${name} was added to outpatient departments.`);
    } catch (error) {
      setOutpatientDepartmentError(error.message || "Unable to add outpatient department. Check Firebase write permission for departments.");
    }
  };

  const handleUpdateOutpatientDepartment = async (event) => {
    event.preventDefault();
    const name = editingOutpatientDepartment?.name.trim();
    if (!name) return;
    if (outpatientDepartmentExists(name, editingOutpatientDepartment.id)) {
      setOutpatientDepartmentError("That outpatient department already exists.");
      return;
    }

    try {
      await updateOutpatientDepartment(editingOutpatientDepartment.id, name);
      setEditingOutpatientDepartment(null);
      setOutpatientDepartmentError("");
      setSuccessMessage(`${name} was updated in outpatient departments.`);
    } catch (error) {
      setOutpatientDepartmentError(error.message || "Unable to update outpatient department. Check Firebase write permission for departments.");
    }
  };

  const handleDeleteOutpatientDepartment = async (id) => {
    const departmentName = outpatientDepartments.find((department) => department.id === id)?.name || "Outpatient department";
    try {
      await deleteOutpatientDepartment(id);
      setOutpatientDepartmentError("");
      setSuccessMessage(`${departmentName} was deleted from outpatient departments.`);
    } catch (error) {
      setOutpatientDepartmentError(error.message || "Unable to delete outpatient department. Check Firebase write permission for departments.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl min-h-full lg:h-full lg:min-h-0 flex flex-col overflow-visible lg:overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 mb-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              System <span className="text-green-700">Settings</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Manage system defaults, department lists, report exports, and action logs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase"
            >
              <RotateCcw size={17} />
              Defaults
            </button>
            <button
              onClick={saveSettings}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase transition"
            >
              <Save size={17} />
              Save Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-visible lg:overflow-hidden">
          <div className="lg:col-span-3 min-h-0">
            <div className="mrs-panel rounded-2xl p-3">
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-colors lg:w-full ${
                      isActive ? "bg-green-700 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 min-h-0 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
            <div className="mrs-panel rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-100 text-green-700">
                    <ActiveIcon size={21} />
                  </div>
                  <div>
                    <h2 className="font-black uppercase text-slate-800">{activeTabMeta.label}</h2>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 flex-1 min-h-0 overflow-visible lg:overflow-hidden">
                {activeTab === "rules" && (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-black uppercase text-slate-700">Appearance</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Choose the display mode for this workstation.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { id: "light", label: "Light", icon: Sun },
                          { id: "dark", label: "Dark", icon: Moon },
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const isActive = settings.appearanceMode === mode.id;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => handleChange("appearanceMode", mode.id)}
                              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase transition-colors ${
                                isActive
                                  ? "bg-blue-700 text-white"
                                  : "mrs-soft-button"
                              }`}
                            >
                              <Icon size={16} />
                              {mode.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Light Comfort
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {[
                            { id: "normal", label: "Normal Light" },
                            { id: "soft", label: "Reduce Light" },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => handleChange("lightComfortMode", mode.id)}
                              className={`rounded-xl px-2 py-2 text-[10px] font-black uppercase transition-colors ${
                                settings.lightComfortMode === mode.id
                                  ? "bg-green-700 text-white"
                                  : "mrs-soft-button"
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-black uppercase text-slate-700">Report Defaults</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Set how the reports page opens and how Excel exports are named.
                      </p>
                      <div className="mt-3 space-y-3">
                        <Field label="Default Report Filter">
                          <select
                            value={settings.defaultReportFilter}
                            onChange={(event) => handleChange("defaultReportFilter", event.target.value)}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          >
                            <option value="all">All Records</option>
                            <option value="borrowed">Borrowed</option>
                            <option value="returned">Returned</option>
                            <option value="canceled">Canceled</option>
                          </select>
                        </Field>
                        <Field label="Excel Export Filename">
                          <input
                            value={settings.reportExportFileName}
                            onChange={(event) => handleChange("reportExportFileName", event.target.value)}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          />
                        </Field>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-black uppercase text-slate-700">Security Defaults</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Protect open workstations by locking inactive sessions.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <Field label="Auto Lock After Inactivity" hint="Minimum 5 minutes. Maximum 240 minutes.">
                          <input
                            type="number"
                            min="5"
                            max="240"
                            value={settings.sessionTimeoutMinutes}
                            onChange={(event) => handleChange("sessionTimeoutMinutes", event.target.value)}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          />
                        </Field>
                        <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase text-green-700">Role Ready</p>
                          <p className="text-xs font-semibold text-green-700">
                            Staff and head rules can use the saved user role tomorrow.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3 xl:col-span-3">
                      <p className="text-sm font-black uppercase text-slate-700">Workspace Summary</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { label: "Borrowing Departments", value: departments.length || fallbackDepartments.length },
                          { label: "Admission Departments", value: admissionLocations.length || fallbackAdmissionLocations.length },
                          { label: "Outpatient Departments", value: outpatientDepartments.length || fallbackOutpatientDepartments.length },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-2.5">
                            <p className="text-[10px] font-black uppercase text-slate-400">{item.label}</p>
                            <p className="mt-0.5 text-xl font-black text-slate-800">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "departmentEditor" && (
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {departmentEditorSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setDepartmentEditorTab(section.id)}
                        className={`rounded-xl px-4 py-3 text-xs font-black uppercase transition-colors ${
                          departmentEditorTab === section.id
                            ? "bg-green-700 text-white"
                            : "mrs-soft-button"
                        }`}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "departmentEditor" && departmentEditorTab === "departments" && (
                  <div className="lg:h-full min-h-0 flex flex-col gap-4">
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-700 uppercase">Borrowing Departments</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Used in Chart Tracking when a chart is borrowed by a hospital department.
                      </p>
                    </div>
                    <form onSubmit={handleAddDepartment} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        value={departmentName}
                        onChange={(event) => {
                          setDepartmentName(event.target.value);
                          setDepartmentError("");
                        }}
                        placeholder="Add borrowing department or hospital area"
                        className="mrs-field w-full rounded-xl p-3 font-bold"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </form>

                    <div className="flex-1 min-h-0 space-y-2 overflow-y-visible pb-20 lg:overflow-y-auto pr-1">
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
                                className="mrs-field w-full rounded-xl p-2 font-bold"
                              />
                              <button type="submit" className="inline-flex items-center justify-center p-2 rounded-xl bg-green-700 text-white" aria-label="Save department">
                                <Check size={18} />
                              </button>
                              <button type="button" onClick={() => setEditingDepartment(null)} className="inline-flex items-center justify-center p-2 rounded-xl border-2 border-slate-200 text-slate-500" aria-label="Cancel edit">
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
                )}

                {activeTab === "departmentEditor" && departmentEditorTab === "admissions" && (
                  <div className="lg:h-full min-h-0 flex flex-col gap-4">
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-700 uppercase">Patient Admission Locations</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Used only by inpatient registration. Defaults are Nurse Station, Emergency, NICU, and MICU.
                      </p>
                    </div>

                    <form onSubmit={handleAddAdmissionLocation} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        value={admissionLocationName}
                        onChange={(event) => {
                          setAdmissionLocationName(event.target.value);
                          setAdmissionLocationError("");
                        }}
                        placeholder="Add admission location"
                        className="mrs-field w-full rounded-xl p-3 font-bold"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </form>

                    <div className="flex-1 min-h-0 space-y-2 overflow-y-visible pb-20 lg:overflow-y-auto pr-1">
                      {admissionLocations.map((location) => (
                        <div
                          key={location.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-2 border-slate-100 rounded-xl p-3"
                        >
                          {editingAdmissionLocation?.id === location.id ? (
                            <form onSubmit={handleUpdateAdmissionLocation} className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                              <input
                                value={editingAdmissionLocation.name}
                                onChange={(event) => setEditingAdmissionLocation({ ...editingAdmissionLocation, name: event.target.value })}
                                className="mrs-field w-full rounded-xl p-2 font-bold"
                              />
                              <button type="submit" className="inline-flex items-center justify-center p-2 rounded-xl bg-green-700 text-white" aria-label="Save admission location">
                                <Check size={18} />
                              </button>
                              <button type="button" onClick={() => setEditingAdmissionLocation(null)} className="inline-flex items-center justify-center p-2 rounded-xl border-2 border-slate-200 text-slate-500" aria-label="Cancel edit">
                                <X size={18} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <p className="font-black text-slate-800">{location.name}</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingAdmissionLocation(location)}
                                  className="p-2 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-black hover:text-black"
                                  aria-label={`Edit ${location.name}`}
                                >
                                  <Edit size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdmissionLocation(location.id)}
                                  className="p-2 rounded-xl border-2 border-red-100 text-red-500 hover:border-red-300"
                                  aria-label={`Delete ${location.name}`}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {admissionLocations.length === 0 && (
                        <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-700">No Firebase admission locations yet.</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">
                            Patient Registry will temporarily use: {fallbackAdmissionLocations.join(", ")}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "departmentEditor" && departmentEditorTab === "outpatients" && (
                  <div className="lg:h-full min-h-0 flex flex-col gap-4">
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-700 uppercase">Outpatient Departments</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Used only by outpatient registration. Defaults are RDU, OR, ONCO, and ENDOSCOPY.
                      </p>
                    </div>

                    <form onSubmit={handleAddOutpatientDepartment} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        value={outpatientDepartmentName}
                        onChange={(event) => {
                          setOutpatientDepartmentName(event.target.value);
                          setOutpatientDepartmentError("");
                        }}
                        placeholder="Add outpatient department"
                        className="mrs-field w-full rounded-xl p-3 font-bold"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </form>

                    <div className="flex-1 min-h-0 space-y-2 overflow-y-visible pb-20 lg:overflow-y-auto pr-1">
                      {outpatientDepartments.map((department) => (
                        <div
                          key={department.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-2 border-slate-100 rounded-xl p-3"
                        >
                          {editingOutpatientDepartment?.id === department.id ? (
                            <form onSubmit={handleUpdateOutpatientDepartment} className="flex-1 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                              <input
                                value={editingOutpatientDepartment.name}
                                onChange={(event) => setEditingOutpatientDepartment({ ...editingOutpatientDepartment, name: event.target.value })}
                                className="mrs-field w-full rounded-xl p-2 font-bold"
                              />
                              <button type="submit" className="inline-flex items-center justify-center p-2 rounded-xl bg-green-700 text-white" aria-label="Save outpatient department">
                                <Check size={18} />
                              </button>
                              <button type="button" onClick={() => setEditingOutpatientDepartment(null)} className="inline-flex items-center justify-center p-2 rounded-xl border-2 border-slate-200 text-slate-500" aria-label="Cancel edit">
                                <X size={18} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <p className="font-black text-slate-800">{department.name}</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingOutpatientDepartment(department)}
                                  className="p-2 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-black hover:text-black"
                                  aria-label={`Edit ${department.name}`}
                                >
                                  <Edit size={17} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOutpatientDepartment(department.id)}
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

                      {outpatientDepartments.length === 0 && (
                        <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-700">No Firebase outpatient departments yet.</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">
                            Patient Registry will temporarily use: {fallbackOutpatientDepartments.join(", ")}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="lg:h-full min-h-0 flex flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-700">Notification Action Log</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Tracks timestamp, user, patient, case number, and completed actions from system notifications.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearNotificationLogs}
                        className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-4 py-3 text-xs font-black uppercase"
                      >
                        Clear Logs
                      </button>
                    </div>

                    <div className="mrs-panel flex-1 min-h-0 overflow-x-auto overflow-y-visible rounded-2xl lg:overflow-y-auto">
                      <table className="w-full min-w-[960px] table-fixed text-left">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="border-b border-slate-100">
                            <th className="w-[18%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                            <th className="w-[17%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                            <th className="w-[20%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Name</th>
                            <th className="w-[14%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Case Number</th>
                            <th className="w-[16%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                            <th className="w-[15%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {notificationLogs.map((log) => (
                            <tr key={log.id} className="mrs-table-row">
                              <td className="p-3 text-xs font-bold text-slate-600">{formatLogTimestamp(log.createdAt)}</td>
                              <td className="p-3">
                                <p className="text-sm font-black uppercase text-slate-800 break-words">
                                  {log.userName || "Unknown User"}
                                </p>
                                {log.userEmail && (
                                  <p className="mt-1 text-[10px] font-bold text-slate-400 break-words">
                                    {log.userEmail}
                                  </p>
                                )}
                              </td>
                              <td className="p-3 text-sm font-black uppercase text-slate-800 break-words">
                                {log.patientName || "N/A"}
                              </td>
                              <td className="p-3 font-mono text-xs font-black text-green-800 break-words">
                                {log.caseNumber || "N/A"}
                              </td>
                              <td className="p-3">
                                <span className="inline-flex rounded-full border-2 border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-700">
                                  {log.action || log.title || "Notification"}
                                </span>
                              </td>
                              <td className="p-3 text-xs font-semibold text-slate-500 break-words">{log.message}</td>
                            </tr>
                          ))}

                          {notificationLogs.length === 0 && (
                            <tr>
                              <td colSpan="6" className="p-10 text-center">
                                <Bell size={38} className="mx-auto mb-3 text-slate-300" />
                                <p className="font-black uppercase text-slate-700">No notification logs yet</p>
                                <p className="mt-1 text-sm font-semibold text-slate-400">
                                  Patient and chart actions will appear here after a toast is generated.
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              {[
                { label: "Borrowing Departments", value: departments.length || fallbackDepartments.length, icon: Building2 },
                { label: "Admission Departments", value: admissionLocations.length || fallbackAdmissionLocations.length, icon: Building2 },
                { label: "Outpatient Departments", value: outpatientDepartments.length || fallbackOutpatientDepartments.length, icon: Building2 },
                { label: "Report Filter", value: settings.defaultReportFilter, icon: SettingsIcon },
              ].map((item) => (
                <div key={item.label} className="mrs-card rounded-2xl p-3">
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

      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsResetConfirmOpen(false)}
          />
          <div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <RotateCcw size={26} />
            </div>
            <h2 className="text-xl font-black uppercase text-slate-800">Restore Defaults?</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              This will reset the system settings values to their defaults.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetSettings}
                className="rounded-xl bg-amber-500 px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-amber-500/20"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
      <FloatingToast
        toast={
          departmentError
            ? { type: "error", message: departmentError }
            : admissionLocationError
              ? { type: "error", message: admissionLocationError }
              : outpatientDepartmentError
                ? { type: "error", message: outpatientDepartmentError }
                : savedMessage
                  ? { type: "success", title: "Settings Updated", message: savedMessage }
                  : successMessage
                    ? { type: "success", title: "List Updated", message: successMessage }
                  : null
        }
        onClose={() => {
          setDepartmentError("");
          setAdmissionLocationError("");
          setOutpatientDepartmentError("");
          setSavedMessage("");
          setSuccessMessage("");
        }}
      />
    </DashboardLayout>
  );
}
