import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import DepartmentEditorConfirmModal from "../modals/settings/DepartmentEditorConfirmModal";
import DepartmentEditorEntryModal from "../modals/settings/DepartmentEditorEntryModal";
import SettingsClearLogsConfirmModal from "../modals/settings/SettingsClearLogsConfirmModal";
import SettingsResetConfirmModal from "../modals/settings/SettingsResetConfirmModal";
import UserAccessConfirmModal from "../modals/users/UserAccessConfirmModal";
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
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  UserX,
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
  subscribeToUsers,
  updateAdmissionLocation,
  updateDepartment,
  updateOutpatientDepartment,
  updateUserAccess,
} from "../services/userService";
import {
  clearAuditLogs,
  subscribeToAuditLogs,
} from "../services/chartService";
import {
  applySystemTheme,
  defaultSystemSettings,
  readSystemSettings,
  saveSystemSettings,
} from "../utils/systemSettings";
import {
  clearStoredBellNotifications,
  clearStoredNotifications,
  writeStoredUnreadNotifications,
} from "../utils/notificationLog";
import { formatDisplayDate } from "../utils/dateFormatting";
import { useAuth } from "../context/useAuth";

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

const departmentEntryDetails = {
  departments: {
    label: "Borrowing Department",
    placeholder: "Enter borrowing department or hospital area",
    title: "Add Borrowing Department",
  },
  admissions: {
    label: "Admission Location",
    placeholder: "Enter admission location",
    title: "Add Admission Location",
  },
  outpatients: {
    label: "Outpatient Department",
    placeholder: "Enter outpatient department",
    title: "Add Outpatient Department",
  },
};

// Formats notification log timestamps with the date style used across dashboard tables.
function formatLogTimestamp(value) {
  if (!value) return "N/A";
  return formatDisplayDate(value);
}

// Renders a settings form field with a consistent label, control, and helper hint.
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

export default function Settings({ initialTab = "rules" }) {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [departmentEditorTab, setDepartmentEditorTab] = useState("departments");
  const [settings, setSettings] = useState(readSystemSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentError, setDepartmentError] = useState("");
  const [admissionLocations, setAdmissionLocations] = useState([]);
  const [editingAdmissionLocation, setEditingAdmissionLocation] = useState(null);
  const [admissionLocationError, setAdmissionLocationError] = useState("");
  const [outpatientDepartments, setOutpatientDepartments] = useState([]);
  const [editingOutpatientDepartment, setEditingOutpatientDepartment] = useState(null);
  const [outpatientDepartmentError, setOutpatientDepartmentError] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [clearLogsMessage, setClearLogsMessage] = useState("");
  const [pendingAccessAction, setPendingAccessAction] = useState(null);
  const [pendingDepartmentEntry, setPendingDepartmentEntry] = useState(null);
  const [pendingDepartmentAction, setPendingDepartmentAction] = useState(null);
  const [isDepartmentActionSaving, setIsDepartmentActionSaving] = useState(false);
  const visibleTabs = useMemo(
    () => (isAdmin ? tabs : tabs.filter((tab) => tab.id === "rules")),
    [isAdmin],
  );

  useEffect(() => {
    // Loads admin-only editable lists and audit/account data from Firestore.
    const unsubscribeDepartments = isAdmin
      ? subscribeToDepartments(
          setDepartments,
          (error) => setDepartmentError(error.message || "Unable to load departments from Firebase."),
        )
      : () => {};

    const unsubscribeAdmissionLocations = isAdmin
      ? subscribeToAdmissionLocations(
          setAdmissionLocations,
          (error) => setAdmissionLocationError(error.message || "Unable to load admission locations from Firebase."),
        )
      : () => {};

    const unsubscribeOutpatientDepartments = isAdmin
      ? subscribeToOutpatientDepartments(
          setOutpatientDepartments,
          (error) => setOutpatientDepartmentError(error.message || "Unable to load outpatient departments from Firebase."),
        )
      : () => {};

    const unsubscribeUsers = isAdmin
      ? subscribeToUsers(
          setUsers,
          (error) => setAccessError(error.message || "Unable to load users from Firebase."),
        )
      : () => {};

    const unsubscribeAuditLogs = isAdmin
      ? subscribeToAuditLogs(
          setNotificationLogs,
          (error) => setAccessError(error.message || "Unable to load audit logs from Firebase."),
        )
      : () => {};

    return () => {
      unsubscribeDepartments();
      unsubscribeAdmissionLocations();
      unsubscribeOutpatientDepartments();
      unsubscribeUsers();
      unsubscribeAuditLogs();
    };
  }, [isAdmin]);

  // Clears centralized audit logs and resets the local navbar unread badge.
  const clearNotificationLogs = async () => {
    if (!isAdmin) {
      setAccessError("Only admins can clear audit logs.");
      return;
    }

    try {
      const clearedCount = notificationLogs.length;
      await clearAuditLogs({
        type: "admin",
        title: "Notification Log Cleared",
        message: `Admin cleared ${clearedCount} notification log record(s).`,
        action: "Notification Log Cleared",
        userName: userProfile?.fullName || currentUser?.displayName || currentUser?.email || "Unknown User",
        userEmail: currentUser?.email || "",
        userId: currentUser?.uid || "",
        adminOnly: true,
      });
      clearStoredNotifications();
      clearStoredBellNotifications();
      writeStoredUnreadNotifications(0);
      window.dispatchEvent(new CustomEvent("mrs-notifications-cleared", {
        detail: { scope: "notification-log" },
      }));
      setNotificationLogs([]);
      setClearLogsMessage("Audit logs were cleared and the clear action was recorded.");
      setIsClearLogsConfirmOpen(false);
    } catch (error) {
      setAccessError(error.message || "Unable to clear audit logs.");
      setIsClearLogsConfirmOpen(false);
    }
  };

  const safeActiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : "rules";
  const activeTabMeta = visibleTabs.find((tab) => tab.id === safeActiveTab) || visibleTabs[0];
  const ActiveIcon = activeTabMeta.icon;

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
  };

  // Updates system settings state and immediately applies theme-related changes.
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
      applySystemTheme(nextSettings);
    }
  };

  // Restores all settings to the built-in defaults.
  const resetSettings = () => {
    setSettings(defaultSystemSettings);
    saveSystemSettings(defaultSystemSettings);
    applySystemTheme(defaultSystemSettings);
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
    setSavedMessage("Settings restored to defaults.");
    setIsResetConfirmOpen(false);
  };

  // Sanitizes and saves the settings form into local storage.
  const saveSettings = () => {
    const cleanedSettings = {
      ...settings,
      reportExportFileName: settings.reportExportFileName.trim() || "chart-activity-report",
      sessionTimeoutMinutes: Math.min(60, Math.max(5, Number(settings.sessionTimeoutMinutes) || 10)),
    };
    setSettings(cleanedSettings);
    saveSystemSettings(cleanedSettings);
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
    setSavedMessage("Settings saved.");
  };

  // Checks duplicate borrowing departments while allowing the row being edited.
  const departmentExists = (name, ignoredId = "") => {
    return departments.some(
      (department) =>
        department.id !== ignoredId &&
        department.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  // Checks duplicate admission locations while allowing the row being edited.
  const admissionLocationExists = (name, ignoredId = "") => {
    return admissionLocations.some(
      (location) =>
        location.id !== ignoredId &&
        location.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  // Checks duplicate outpatient departments while allowing the row being edited.
  const outpatientDepartmentExists = (name, ignoredId = "") => {
    return outpatientDepartments.some(
      (department) =>
        department.id !== ignoredId &&
        department.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  };

  // Opens a confirmation dialog after department editor validation passes.
  const openDepartmentConfirmation = (action) => {
    setDepartmentError("");
    setAdmissionLocationError("");
    setOutpatientDepartmentError("");
    setSuccessMessage("");
    setPendingDepartmentAction(action);
  };

  // Adds a borrowing department after local duplicate validation.
  const handleAddDepartment = (value) => {
    const name = value.trim();
    if (!name) {
      setDepartmentError("Enter a borrowing department name.");
      return false;
    }
    if (departmentExists(name)) {
      setDepartmentError("That department already exists.");
      return false;
    }

    openDepartmentConfirmation({
      type: "add",
      section: "departments",
      name,
      title: "Add Borrowing Department?",
      message: "This will add a new borrowing department to Chart Tracking.",
    });
    return true;
  };

  // Saves an edited borrowing department name.
  const handleUpdateDepartment = async (event) => {
    event.preventDefault();
    const name = editingDepartment?.name.trim();
    if (!name) return;
    if (departmentExists(name, editingDepartment.id)) {
      setDepartmentError("That department already exists.");
      return;
    }

    openDepartmentConfirmation({
      type: "update",
      section: "departments",
      id: editingDepartment.id,
      name,
      title: "Update Borrowing Department?",
      message: "This will rename the selected borrowing department.",
    });
  };

  // Deletes a borrowing department by Firestore id.
  const handleDeleteDepartment = (id) => {
    const name = departments.find((department) => department.id === id)?.name || "Department";
    openDepartmentConfirmation({
      type: "delete",
      section: "departments",
      id,
      name,
      title: "Delete Borrowing Department?",
      message: "This will remove the department from Chart Tracking options.",
    });
  };

  // Adds an inpatient admission location after duplicate validation.
  const handleAddAdmissionLocation = (value) => {
    const name = value.trim();
    if (!name) {
      setAdmissionLocationError("Enter an admission location name.");
      return false;
    }
    if (admissionLocationExists(name)) {
      setAdmissionLocationError("That admission location already exists.");
      return false;
    }

    openDepartmentConfirmation({
      type: "add",
      section: "admissions",
      name,
      title: "Add Admission Location?",
      message: "This will add a new inpatient admission location to Patient Registry.",
    });
    return true;
  };

  // Saves an edited inpatient admission location.
  const handleUpdateAdmissionLocation = async (event) => {
    event.preventDefault();
    const name = editingAdmissionLocation?.name.trim();
    if (!name) return;
    if (admissionLocationExists(name, editingAdmissionLocation.id)) {
      setAdmissionLocationError("That admission location already exists.");
      return;
    }

    openDepartmentConfirmation({
      type: "update",
      section: "admissions",
      id: editingAdmissionLocation.id,
      name,
      title: "Update Admission Location?",
      message: "This will rename the selected inpatient admission location.",
    });
  };

  // Deletes an inpatient admission location by Firestore id.
  const handleDeleteAdmissionLocation = (id) => {
    const name = admissionLocations.find((location) => location.id === id)?.name || "Admission location";
    openDepartmentConfirmation({
      type: "delete",
      section: "admissions",
      id,
      name,
      title: "Delete Admission Location?",
      message: "This will remove the location from inpatient registration options.",
    });
  };

  // Adds an outpatient department after duplicate validation.
  const handleAddOutpatientDepartment = (value) => {
    const name = value.trim();
    if (!name) {
      setOutpatientDepartmentError("Enter an outpatient department name.");
      return false;
    }
    if (outpatientDepartmentExists(name)) {
      setOutpatientDepartmentError("That outpatient department already exists.");
      return false;
    }

    openDepartmentConfirmation({
      type: "add",
      section: "outpatients",
      name,
      title: "Add Outpatient Department?",
      message: "This will add a new outpatient department to Patient Registry.",
    });
    return true;
  };

  // Saves an edited outpatient department.
  const handleUpdateOutpatientDepartment = async (event) => {
    event.preventDefault();
    const name = editingOutpatientDepartment?.name.trim();
    if (!name) return;
    if (outpatientDepartmentExists(name, editingOutpatientDepartment.id)) {
      setOutpatientDepartmentError("That outpatient department already exists.");
      return;
    }

    openDepartmentConfirmation({
      type: "update",
      section: "outpatients",
      id: editingOutpatientDepartment.id,
      name,
      title: "Update Outpatient Department?",
      message: "This will rename the selected outpatient department.",
    });
  };

  // Deletes an outpatient department by Firestore id.
  const handleDeleteOutpatientDepartment = (id) => {
    const name = outpatientDepartments.find((department) => department.id === id)?.name || "Outpatient department";
    openDepartmentConfirmation({
      type: "delete",
      section: "outpatients",
      id,
      name,
      title: "Delete Outpatient Department?",
      message: "This will remove the department from outpatient registration options.",
    });
  };

  // Applies the confirmed department editor action to Firebase.
  const confirmDepartmentAction = async () => {
    if (!pendingDepartmentAction || isDepartmentActionSaving) return;

    const { id, name, section, type } = pendingDepartmentAction;
    setIsDepartmentActionSaving(true);

    try {
      if (section === "departments") {
        if (type === "add") {
          await addDepartment(name);
          setSuccessMessage(`${name} was added to borrowing departments.`);
        } else if (type === "update") {
          await updateDepartment(id, name);
          setEditingDepartment(null);
          setSuccessMessage(`${name} was updated in borrowing departments.`);
        } else {
          await deleteDepartment(id);
          setSuccessMessage(`${name} was deleted from borrowing departments.`);
        }
        setDepartmentError("");
      }

      if (section === "admissions") {
        if (type === "add") {
          await addAdmissionLocation(name);
          setSuccessMessage(`${name} was added to admission locations.`);
        } else if (type === "update") {
          await updateAdmissionLocation(id, name);
          setEditingAdmissionLocation(null);
          setSuccessMessage(`${name} was updated in admission locations.`);
        } else {
          await deleteAdmissionLocation(id);
          setSuccessMessage(`${name} was deleted from admission locations.`);
        }
        setAdmissionLocationError("");
      }

      if (section === "outpatients") {
        if (type === "add") {
          await addOutpatientDepartment(name);
          setSuccessMessage(`${name} was added to outpatient departments.`);
        } else if (type === "update") {
          await updateOutpatientDepartment(id, name);
          setEditingOutpatientDepartment(null);
          setSuccessMessage(`${name} was updated in outpatient departments.`);
        } else {
          await deleteOutpatientDepartment(id);
          setSuccessMessage(`${name} was deleted from outpatient departments.`);
        }
        setOutpatientDepartmentError("");
      }

      setPendingDepartmentAction(null);
    } catch (error) {
      const message = error.message || "Unable to save department editor change. Check Firebase write permission for departments.";
      if (section === "departments") setDepartmentError(message);
      if (section === "admissions") setAdmissionLocationError(message);
      if (section === "outpatients") setOutpatientDepartmentError(message);
      setPendingDepartmentAction(null);
    } finally {
      setIsDepartmentActionSaving(false);
    }
  };

  // Routes the add modal submission to the active department editor list.
  const submitDepartmentEntry = (name) => {
    let isValid = false;
    if (pendingDepartmentEntry === "departments") isValid = handleAddDepartment(name);
    if (pendingDepartmentEntry === "admissions") isValid = handleAddAdmissionLocation(name);
    if (pendingDepartmentEntry === "outpatients") isValid = handleAddOutpatientDepartment(name);
    if (isValid) setPendingDepartmentEntry(null);
    return isValid;
  };

  // Updates a user's role while preventing the signed-in admin from demoting their own account.
  const handleRoleChange = async (user, role) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid && role !== "admin") {
      setAccessError("You cannot remove admin access from your own signed-in account.");
      return;
    }

    try {
      await updateUserAccess(userId, { role });
      setAccessError("");
      setAccessMessage(`${user.fullName || user.email || "User"} role updated to ${role}.`);
    } catch (error) {
      setAccessError(error.message || "Unable to update user role.");
    }
  };

  // Opens a confirmation before blocking a staff account with a required reason.
  const handleBlockUser = (user) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid) {
      setAccessError("You cannot block your own signed-in account.");
      return;
    }

    const reason = (restrictionReasons[userId] || "").trim();
    if (!reason) {
      setAccessError("Enter a reason before blocking this account.");
      return;
    }

    setAccessError("");
    setPendingAccessAction({ type: "block", user, reason });
  };

  // Opens a confirmation before re-activating a blocked staff account.
  const handleActivateUser = (user) => {
    setAccessError("");
    setPendingAccessAction({ type: "activate", user });
  };

  // Applies the confirmed block or activate account-control change.
  const confirmAccessAction = async () => {
    if (!pendingAccessAction) return;

    const { type, user, reason = "" } = pendingAccessAction;
    const userId = user.uid || user.id;
    const userName = user.fullName || user.email || "User";

    try {
      if (type === "block") {
        await updateUserAccess(userId, {
          accountStatus: "disabled",
          restrictionReason: reason,
        });
      } else {
        await updateUserAccess(userId, {
          accountStatus: "active",
          restrictionReason: "",
        });
      }
      setAccessError("");
      setAccessMessage(`${userName} was ${type === "block" ? "blocked" : "activated"}.`);
      setPendingAccessAction(null);
    } catch (error) {
      setAccessError(error.message || `Unable to ${type} user.`);
      setPendingAccessAction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 max-w-7xl flex-col overflow-hidden">
        <div className="mb-2 flex shrink-0 flex-col justify-between gap-2 xl:flex-row xl:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              System <span className="text-green-700">Settings</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {isAdmin
                ? "Manage system defaults, department lists, report exports, and action logs."
                : "Staff can access system settings only. Department lists, access control, and logs stay admin-only."}
            </p>
          </div>

          {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
              >
                <RotateCcw size={17} />
                Defaults
              </button>
            )}
            <button
              onClick={saveSettings}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition"
            >
              <Save size={17} />
              Save Settings
            </button>
          </div>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-12">
          <div className="lg:col-span-3 min-h-0">
            <div className="mrs-panel rounded-2xl p-3">
              <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = safeActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
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

          <div className="flex min-h-0 flex-col gap-2 overflow-hidden lg:col-span-9">
            <div className="mrs-panel rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-100 text-green-700">
                    <ActiveIcon size={21} />
                  </div>
                  <div>
                    <h2 className="font-black uppercase text-slate-800">{activeTabMeta.label}</h2>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
                {safeActiveTab === "rules" && (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className={`rounded-xl border-2 border-slate-100 bg-slate-50 p-3 ${isAdmin ? "" : "xl:col-span-3"}`}>
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
                          Comfort
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {[
                            { id: "normal", label: "Standard" },
                            { id: "soft", label: "Reduce Glare" },
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
                    {isAdmin && (
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
                    )}
                    {isAdmin && (
                    <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-black uppercase text-slate-700">Security Defaults</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Protect open workstations by locking inactive sessions.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Auto Lock After Inactivity
                          </p>
                          <input
                            type="number"
                            min="5"
                            max="60"
                            value={settings.sessionTimeoutMinutes}
                            onChange={(event) => handleChange("sessionTimeoutMinutes", event.target.value)}
                            className="mrs-field mt-2 w-full rounded-lg px-3 py-2 text-sm font-black"
                          />
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Admin-configurable policy from 5 to 60 minutes. Users see a warning before auto logout.
                          </p>
                        </div>
                      </div>
                    </div>
                    )}
                    {isAdmin && (
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
                    )}
                  </div>
                )}

                {safeActiveTab === "departmentEditor" && (
                  <div className="mb-4 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
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

                {safeActiveTab === "departmentEditor" && departmentEditorTab === "departments" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase">Borrowing Departments</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Used in Chart Tracking when a chart is borrowed by a hospital department.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingDepartmentEntry("departments")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-xs font-black uppercase text-white"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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

                {safeActiveTab === "departmentEditor" && departmentEditorTab === "admissions" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase">Patient Admission Locations</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Used only by inpatient registration. Defaults are Nurse Station, Emergency, NICU, and MICU.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingDepartmentEntry("admissions")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-xs font-black uppercase text-white"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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

                {safeActiveTab === "departmentEditor" && departmentEditorTab === "outpatients" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase">Outpatient Departments</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Used only by outpatient registration. Defaults are RDU, OR, ONCO, and ENDOSCOPY.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingDepartmentEntry("outpatients")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-xs font-black uppercase text-white"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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

                {safeActiveTab === "access" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <div className="grid gap-3 xl:grid-cols-3">
                      <div className="rounded-xl border-2 border-green-100 bg-green-50 p-4 xl:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-white p-2 text-green-700">
                            <ShieldCheck size={21} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase text-slate-800">Secure Admin Creation</p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                              Keep public sign-up as staff only. Create admins from Firebase Console or a one-time protected seed script, then set their user document role to admin and protect that field with Firestore rules.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-black uppercase text-blue-800">Staff Restrictions</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-blue-700">
                          Staff can open limited Settings, but cannot clear logs, delete report rows, manage accounts, or edit department lists from the UI.
                        </p>
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-visible lg:overflow-y-auto xl:grid-cols-2">
                      {users.map((user) => {
                        const userId = user.uid || user.id;
                        const isSelf = userId === currentUser?.uid;
                        const isDisabled = user.accountStatus === "disabled";

                        return (
                          <div key={userId} className="mrs-card rounded-2xl p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-black uppercase text-slate-800">
                                  {user.fullName || user.displayName || "Unnamed User"}
                                </p>
                                <p className="mt-1 break-words text-[10px] font-bold text-slate-400">
                                  {user.email || "No email saved"}
                                </p>
                              </div>
                              <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                                isDisabled
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-green-200 bg-green-50 text-green-700"
                              }`}>
                                {isDisabled ? "Blocked" : "Active"}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Role</span>
                                <select
                                  value={user.role === "admin" ? "admin" : "staff"}
                                  onChange={(event) => handleRoleChange(user, event.target.value)}
                                  disabled={isSelf}
                                  className="mrs-field w-full rounded-xl px-3 py-2 text-xs font-black uppercase disabled:opacity-60"
                                  aria-label={`Role for ${user.email || user.fullName || "user"}`}
                                >
                                  <option value="staff">Staff</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Restriction Reason</span>
                                <input
                                  value={restrictionReasons[userId] ?? user.restrictionReason ?? ""}
                                  onChange={(event) => setRestrictionReasons((current) => ({
                                    ...current,
                                    [userId]: event.target.value,
                                  }))}
                                  placeholder="Required before blocking"
                                  className="mrs-field w-full rounded-xl px-3 py-2 text-xs font-bold"
                                  disabled={isSelf}
                                />
                              </label>
                            </div>

                            <div className="mt-4 flex justify-end">
                              {isDisabled ? (
                                <button
                                  type="button"
                                  onClick={() => handleActivateUser(user)}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-black uppercase text-green-700"
                                >
                                  <UserCheck size={16} />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleBlockUser(user)}
                                  disabled={isSelf}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black uppercase text-red-600 disabled:opacity-50"
                                >
                                  <UserX size={16} />
                                  Block
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {users.length === 0 && (
                        <div className="mrs-card rounded-2xl p-10 text-center xl:col-span-2">
                          <ShieldCheck size={38} className="mx-auto mb-3 text-slate-300" />
                          <p className="font-black uppercase text-slate-700">No user profiles yet</p>
                          <p className="mt-1 text-sm font-semibold text-slate-400">
                            Profiles appear after users sign in or create a staff account.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {safeActiveTab === "notifications" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-700">Notification Action Log</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Tracks timestamp, user, patient, case number, and completed actions from system notifications.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (notificationLogs.length === 0) {
                            setClearLogsMessage("There are no audit logs to clear.");
                            return;
                          }
                          setIsClearLogsConfirmOpen(true);
                        }}
                        className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-4 py-3 text-xs font-black uppercase"
                      >
                        Clear Logs
                      </button>
                    </div>

                    <div className="mrs-panel min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl">
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

            {isAdmin && (
              <div className="grid shrink-0 grid-cols-1 gap-3 pb-1 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Borrowing Departments", value: departments.length || fallbackDepartments.length, icon: Building2 },
                  { label: "Admission Departments", value: admissionLocations.length || fallbackAdmissionLocations.length, icon: Building2 },
                  { label: "Outpatient Departments", value: outpatientDepartments.length || fallbackOutpatientDepartments.length, icon: Building2 },
                  { label: "Report Filter", value: settings.defaultReportFilter, icon: SettingsIcon },
                ].map((item) => (
                  <div key={item.label} className="mrs-card rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-green-100 bg-green-50 p-2 text-green-700">
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
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <SettingsResetConfirmModal
            isOpen={isResetConfirmOpen}
            onCancel={() => setIsResetConfirmOpen(false)}
            onConfirm={resetSettings}
          />
          <SettingsClearLogsConfirmModal
            isOpen={isClearLogsConfirmOpen}
            logCount={notificationLogs.length}
            onCancel={() => setIsClearLogsConfirmOpen(false)}
            onConfirm={clearNotificationLogs}
          />
          <DepartmentEditorEntryModal
            isOpen={Boolean(pendingDepartmentEntry)}
            label={departmentEntryDetails[pendingDepartmentEntry]?.label || ""}
            onCancel={() => setPendingDepartmentEntry(null)}
            onSubmit={submitDepartmentEntry}
            placeholder={departmentEntryDetails[pendingDepartmentEntry]?.placeholder || ""}
            title={departmentEntryDetails[pendingDepartmentEntry]?.title || ""}
          />
          <DepartmentEditorConfirmModal
            action={pendingDepartmentAction}
            isSaving={isDepartmentActionSaving}
            onCancel={() => setPendingDepartmentAction(null)}
            onConfirm={confirmDepartmentAction}
          />
          <UserAccessConfirmModal
            action={pendingAccessAction}
            confirmLabel={pendingAccessAction?.type === "block" ? "Block" : "Activate"}
            onCancel={() => setPendingAccessAction(null)}
            onConfirm={confirmAccessAction}
          />
        </>
      )}

      <FloatingToast
        toast={
          departmentError
            ? { type: "error", message: departmentError }
            : admissionLocationError
              ? { type: "error", message: admissionLocationError }
              : outpatientDepartmentError
                ? { type: "error", message: outpatientDepartmentError }
                : accessError
                  ? { type: "error", message: accessError }
                  : clearLogsMessage
                    ? { type: "success", title: "Audit Logs", message: clearLogsMessage }
                  : savedMessage
                    ? { type: "success", title: "Settings Updated", message: savedMessage, action: "Settings Updated", audit: true, adminOnly: isAdmin }
                    : accessMessage
                      ? { type: "success", title: "Access Control", message: accessMessage, action: "Access Control Updated", audit: true, adminOnly: true }
                      : successMessage
                        ? { type: "success", title: "List Updated", message: successMessage, action: "Settings List Updated", audit: true, adminOnly: isAdmin }
                    : null
        }
        onClose={() => {
          setDepartmentError("");
          setAdmissionLocationError("");
          setOutpatientDepartmentError("");
          setAccessError("");
          setClearLogsMessage("");
          setSavedMessage("");
          setAccessMessage("");
          setSuccessMessage("");
        }}
      />
    </DashboardLayout>
  );
}
