import React, { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Calendar,
  Camera,
  ChevronDown,
  Circle,
  CheckCircle2,
  Info,
  ImageOff,
  LogOut,
  Menu,
  Moon,
  Save,
  Settings,
  Sun,
  TriangleAlert,
  UserCircle,
  X,
} from "lucide-react";
import FloatingToast from "./FloatingToast";
import { useAuth } from "../context/useAuth";
import { auth, db } from "../firebaseClient";
import { clearSession } from "../services/sessionService";
import {
  maxNotificationLogItems,
  normalizeNotification,
  readStoredBellNotifications,
  readStoredUnreadNotifications,
  writeStoredBellNotifications,
  writeStoredUnreadNotifications,
} from "../utils/notificationLog";
import { formatDisplayDate } from "../utils/dateFormatting";
import { applySystemTheme, readSystemSettings, saveSystemSettings } from "../utils/systemSettings";
import { isStrongPassword, normalizeEmail } from "../utils/security";

// Builds the compact initials fallback for accounts without an uploaded photo.
function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Reads uploaded profile photos into a browser-safe preview string.
function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Formats notification timestamps with the app-wide date-only display.
function formatNotificationTime(value) {
  return formatDisplayDate(value);
}

// Selects the icon that visually matches each notification tone.
function notificationIcon(type) {
  if (type === "success") return CheckCircle2;
  if (type === "error") return TriangleAlert;
  return Info;
}

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showClearNotificationsConfirm, setShowClearNotificationsConfirm] = useState(false);
  const [notifications, setNotifications] = useState(readStoredBellNotifications);
  const [unreadNotifications, setUnreadNotifications] = useState(readStoredUnreadNotifications);
  const [accountProfile, setAccountProfile] = useState(null);
  const [accountForm, setAccountForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: "",
    department: "Medical Records",
    photoDataUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [appearanceMode, setAppearanceMode] = useState(() => readSystemSettings().appearanceMode);
  const isAdminAccount = accountProfile?.role === "admin";
  const visibleNotifications = isAdminAccount
    ? notifications
    : notifications.filter((notification) => !notification.adminOnly);
  const visibleUnreadNotifications = visibleNotifications.length
    ? Math.min(unreadNotifications, visibleNotifications.length)
    : 0;

  useEffect(() => {
    if (!currentUser || !db) return undefined;

    return onSnapshot(doc(db, "users", currentUser.uid), (snapshot) => {
      const profile = snapshot.exists() ? snapshot.data() : {};
      setAccountProfile(profile);
      setAccountForm({
        fullName: profile.fullName || currentUser.displayName || "",
        email: currentUser.email || profile.email || "",
        phone: profile.phone || "",
        position: profile.position || "",
        department: profile.department || "Medical Records",
        photoDataUrl: profile.photoDataUrl || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    });
  }, [currentUser]);

  useEffect(() => {
    writeStoredBellNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    writeStoredUnreadNotifications(unreadNotifications);
  }, [unreadNotifications]);

  useEffect(() => {
    // Keeps the navbar toggle in sync when settings are changed on another page.
    const syncThemeMode = () => {
      setAppearanceMode(readSystemSettings().appearanceMode);
    };

    window.addEventListener("storage", syncThemeMode);
    window.addEventListener("mrs-settings-updated", syncThemeMode);
    return () => {
      window.removeEventListener("storage", syncThemeMode);
      window.removeEventListener("mrs-settings-updated", syncThemeMode);
    };
  }, []);

  useEffect(() => {
    // Mirrors toast events into the bell dropdown and unread counter.
    const handleToast = (event) => {
      const notification = normalizeNotification(event.detail || {});
      if (!notification?.message) return;
      if (notification.adminOnly && !isAdminAccount) return;

      setNotifications((current) => [notification, ...current].slice(0, maxNotificationLogItems));
      setUnreadNotifications((current) => current + 1);
    };
    const handleNotificationsCleared = () => {
      setNotifications([]);
      setUnreadNotifications(0);
    };

    window.addEventListener("mrs-toast", handleToast);
    window.addEventListener("mrs-notifications-cleared", handleNotificationsCleared);
    return () => {
      window.removeEventListener("mrs-toast", handleToast);
      window.removeEventListener("mrs-notifications-cleared", handleNotificationsCleared);
    };
  }, [isAdminAccount]);

  // Ends the Firebase session and sends the user back to the login page.
  const handleSignOut = async () => {
    clearSession();
    if (auth) {
      await signOut(auth);
    }
    setShowSignOutConfirm(false);
    navigate("/", { replace: true });
  };

  // Clears the bell dropdown history and unread badge.
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadNotifications(0);
    setShowClearNotificationsConfirm(false);
    setShowNotifications(false);
  };

  // Switches between saved light and dark display modes.
  const toggleAppearanceMode = () => {
    const currentSettings = readSystemSettings();
    const nextMode = currentSettings.appearanceMode === "dark" ? "light" : "dark";
    const nextSettings = { ...currentSettings, appearanceMode: nextMode };

    saveSystemSettings(nextSettings);
    setAppearanceMode(nextMode);
    applySystemTheme(nextSettings);
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
  };

  // Validates and previews a profile photo before saving it to Firestore.
  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAccountError("Choose an image file for the profile photo.");
      return;
    }
    if (file.size > 750 * 1024) {
      setAccountError("Use an image smaller than 750 KB.");
      return;
    }

    const photoDataUrl = await readImageAsDataUrl(file);
    setAccountForm((current) => ({ ...current, photoDataUrl }));
    setAccountError("");
    setAccountMessage("");
  };

  const handlePhotoRemove = () => {
    setAccountForm((current) => ({ ...current, photoDataUrl: "" }));
    setAccountError("");
    setAccountMessage("");
  };

  // Persists account profile details to both Firebase Auth and the user document.
  const handleAccountSave = async (event) => {
    event.preventDefault();
    if (!currentUser || !db) {
      setAccountError("Account settings are unavailable while Firebase is not configured.");
      return;
    }
    if (!accountForm.fullName.trim()) {
      setAccountError("Full name is required.");
      return;
    }
    const nextEmail = normalizeEmail(accountForm.email);
    const isEmailChanged = nextEmail && nextEmail !== normalizeEmail(currentUser.email || "");
    const isPasswordChanged = Boolean(accountForm.newPassword);

    if ((isEmailChanged || isPasswordChanged) && !accountForm.currentPassword) {
      setAccountError("Enter your current password before changing email or password.");
      return;
    }
    if (isPasswordChanged && !isStrongPassword(accountForm.newPassword)) {
      setAccountError("Use at least 8 characters with uppercase, lowercase, and a number for the new password.");
      return;
    }
    if (isPasswordChanged && accountForm.newPassword !== accountForm.confirmNewPassword) {
      setAccountError("New passwords do not match.");
      return;
    }

    try {
      if (isEmailChanged || isPasswordChanged) {
        const credential = EmailAuthProvider.credential(currentUser.email || "", accountForm.currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }
      if (isEmailChanged) {
        await updateEmail(currentUser, nextEmail);
      }
      if (isPasswordChanged) {
        await updatePassword(currentUser, accountForm.newPassword);
      }
      await updateProfile(currentUser, {
        displayName: accountForm.fullName.trim(),
      });
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          fullName: accountForm.fullName.trim(),
          email: nextEmail || currentUser.email || "",
          phone: accountForm.phone.trim(),
          position: accountForm.position.trim(),
          department: accountForm.department.trim() || "Medical Records",
          photoDataUrl: accountForm.photoDataUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setAccountMessage("Account settings saved.");
      setAccountError("");
      setAccountForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setShowAccountSettings(false);
    } catch (error) {
      const credentialMessages = {
        "auth/email-already-in-use": "That email is already used by another account.",
        "auth/invalid-credential": "The current password is incorrect.",
        "auth/requires-recent-login": "Enter your current password and try again.",
        "auth/wrong-password": "The current password is incorrect.",
      };
      setAccountError(credentialMessages[error.code] || error.message || "Unable to save account settings.");
    }
  };

  const displayName = accountProfile?.fullName || currentUser?.displayName || "Administrator";
  const displayEmail = currentUser?.email || "Medical Records";
  const photoDataUrl = accountProfile?.photoDataUrl || accountForm.photoDataUrl;
  const initials = getInitials(displayName);
  const pageTitles = {
    "/dashboard": "Dashboard",
    "/patients": "Patients",
    "/charts": "Chart Circulation",
    "/chart-viewing": "Chart Viewing",
    "/chartviewing": "Chart Viewing",
    "/reports": "Chart Reports",
    "/medical-documents": "Medical Documents",
    "/lab-results": "Laboratory Results",
    "/vital-certificates": "Civil Documents",
    "/tracking-reports": "Medical Reports",
    "/print-reports": "Print Reports",
    "/settings": "Settings",
    "/users": "Users",
  };
  const pageTitle = pageTitles[location.pathname] || "Medical Records";

  return (
    <>
    <div className="mrs-navbar sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-3 border-b px-3 py-2 backdrop-blur-xl sm:px-4 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4">
        <Motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.94 }}
          onClick={onMenuClick}
          className="mrs-icon-button mrs-mobile-menu-button shrink-0 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </Motion.button>

        <div className="mrs-topbar-title flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-1 rounded-full bg-gradient-to-b from-green-500 to-cyan-500 sm:block" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
              TGMCI Records
            </p>
            <h1 className="truncate text-base font-black tracking-tight text-slate-900 leading-tight sm:text-xl sm:leading-none">
              {pageTitle}
            </h1>
          </div>
        </div>
      </div>

      <div className="mrs-topbar-tray flex shrink-0 items-center gap-1.5 rounded-2xl border p-1">
        <div className="mrs-topbar-chip hidden h-8 items-center gap-2 px-2.5 xl:flex">
          <Calendar size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", {
            month: "short",
              day: "numeric",
              year: "numeric",
            }).toUpperCase()}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications((value) => !value);
              setShowProfile(false);
              setUnreadNotifications(0);
            }}
          className="mrs-topbar-action relative flex size-8 items-center justify-center rounded-xl border text-slate-700 transition-colors"
            aria-label="Open notifications"
          >
            <Bell size={16} />
            {visibleUnreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black leading-3 text-white shadow-sm">
                {visibleUnreadNotifications > 9 ? "9+" : visibleUnreadNotifications}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <Motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-black uppercase text-slate-800">Notifications</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Recent system messages
                    </p>
                  </div>
                  {visibleNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearNotificationsConfirm(true)}
                      className="rounded-lg px-2 py-1 text-[10px] font-black uppercase text-slate-500 hover:bg-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-[min(15.75rem,calc(100dvh-9rem))] divide-y divide-slate-100 overflow-y-auto">
                  {visibleNotifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-black uppercase text-slate-700">No notifications yet</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Toast messages will appear here.
                      </p>
                    </div>
                  ) : (
                    visibleNotifications.map((notification) => {
                      const Icon = notificationIcon(notification.type);
                      const iconClass = notification.type === "success"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : notification.type === "error"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-50 text-slate-700 border-slate-200";

                      return (
                        <div key={notification.id} className="flex items-start gap-3 p-3.5">
                          <div className={`shrink-0 rounded-xl border p-2 ${iconClass}`}>
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="break-words text-xs font-black uppercase text-slate-800">
                                {notification.title || (notification.type === "error" ? "Action Needed" : "Success")}
                              </p>
                              <span className="shrink-0 text-[10px] font-bold text-slate-400">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 break-words text-xs font-semibold leading-relaxed text-slate-500">
                              {notification.message}
                            </p>
                            {(notification.patientName || notification.caseNumber) && (
                              <p className="mt-1 break-words text-[10px] font-black uppercase text-slate-400">
                                {[notification.patientName, notification.caseNumber].filter(Boolean).join(" - ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={toggleAppearanceMode}
          className="mrs-topbar-action hidden size-8 items-center justify-center rounded-xl border text-slate-700 transition-colors sm:inline-flex"
          aria-label={appearanceMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={appearanceMode === "dark" ? "Light mode" : "Dark mode"}
        >
          {appearanceMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <Motion.button
            whileHover={{ y: -1 }}
            onClick={() => {
              setShowProfile((value) => !value);
              setShowNotifications(false);
            }}
            className="mrs-profile-button flex cursor-pointer items-center gap-2 rounded-xl border p-1 shadow-sm sm:pr-2"
          >
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-green-700 text-xs font-black text-white shadow-sm">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials || "AD"
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="block max-w-28 truncate whitespace-nowrap text-[11px] font-black leading-tight text-slate-800 2xl:max-w-40">
                  {displayName}
                </span>
                <Circle size={8} className="fill-green-500 text-green-500" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                {accountProfile?.department || "Medical Records"}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 ml-1 transition-transform ${showProfile ? "rotate-180" : ""}`}
            />
          </Motion.button>

          <AnimatePresence>
            {showProfile && (
              <Motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute right-0 mt-3 w-[min(16rem,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-700 text-white border border-black overflow-hidden flex items-center justify-center">
                      {photoDataUrl ? (
                        <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={25} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-black text-slate-800">{displayName}</p>
                      <p className="break-words text-xs font-bold text-slate-500">{displayEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowAccountSettings(true);
                      setShowProfile(false);
                      setAccountMessage("");
                      setAccountError("");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Settings size={17} />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowSignOutConfirm(true);
                      setShowProfile(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>

      <AnimatePresence>
        {showAccountSettings && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setShowAccountSettings(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="mrs-account-modal mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-hidden rounded-2xl"
            >
              <button
                onClick={() => setShowAccountSettings(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/80 text-slate-500 hover:bg-white hover:text-slate-900"
                aria-label="Close account settings"
              >
                <X size={20} />
              </button>

              <div className="mrs-account-header p-5 pr-14">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-green-700">Profile Center</p>
                <h2 className="mt-1 text-xl font-black text-slate-900 uppercase">Account Settings</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Manage your identity, contact details, and password in one place.
                </p>
              </div>

              <form onSubmit={handleAccountSave} className="max-h-[calc(100dvh-8rem)] space-y-4 overflow-y-auto p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[10rem_1fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="group relative mx-auto flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-green-700 text-2xl font-black text-white shadow-lg shadow-green-900/10">
                      {accountForm.photoDataUrl ? (
                        <img src={accountForm.photoDataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials || "AD"
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera size={22} />
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                    <label className="mrs-soft-button mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase">
                      <Camera size={16} />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                    {accountForm.photoDataUrl && (
                      <button
                        type="button"
                        onClick={handlePhotoRemove}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-black uppercase text-red-600 transition-colors hover:bg-red-50"
                      >
                        <ImageOff size={16} />
                        Remove Photo
                      </button>
                    )}
                    <p className="mt-3 text-center text-[10px] font-bold uppercase leading-relaxed text-slate-400">
                      JPG or PNG under 750 KB
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Full Name</span>
                        <input
                          value={accountForm.fullName}
                          onChange={(event) => setAccountForm({ ...accountForm, fullName: event.target.value })}
                          className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          autoComplete="name"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Email</span>
                        <input
                          type="email"
                          value={accountForm.email}
                          onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })}
                          className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          autoComplete="email"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Position</span>
                        <input
                          value={accountForm.position}
                          onChange={(event) => setAccountForm({ ...accountForm, position: event.target.value })}
                          placeholder="Records Staff"
                          className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          autoComplete="organization-title"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Phone</span>
                        <input
                          value={accountForm.phone}
                          onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })}
                          placeholder="Contact number"
                          className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          autoComplete="tel"
                        />
                      </label>
                      <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Department</span>
                        <input
                          value={accountForm.department}
                          onChange={(event) => setAccountForm({ ...accountForm, department: event.target.value })}
                          className="mrs-field w-full rounded-xl p-2.5 font-bold"
                          autoComplete="organization"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <p className="text-sm font-black uppercase text-slate-800">Security</p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          Required only for email or password changes.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">Current Password</span>
                          <input
                            type="password"
                            value={accountForm.currentPassword}
                            onChange={(event) => setAccountForm({ ...accountForm, currentPassword: event.target.value })}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                            autoComplete="current-password"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">New Password</span>
                          <input
                            type="password"
                            value={accountForm.newPassword}
                            onChange={(event) => setAccountForm({ ...accountForm, newPassword: event.target.value })}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                            autoComplete="new-password"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">Confirm Password</span>
                          <input
                            type="password"
                            value={accountForm.confirmNewPassword}
                            onChange={(event) => setAccountForm({ ...accountForm, confirmNewPassword: event.target.value })}
                            className="mrs-field w-full rounded-xl p-2.5 font-bold"
                            autoComplete="new-password"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAccountSettings(false)}
                    className="px-5 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase"
                  >
                    <Save size={17} />
                    Save Account
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignOutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setShowSignOutConfirm(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-7"
            >
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <LogOut size={30} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase">Sign Out?</h2>
              <p className="text-sm font-semibold text-slate-500 mt-2 mb-7">
                You will return to the login screen.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase shadow-lg shadow-red-600/20"
                >
                  Sign Out
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showClearNotificationsConfirm && (
          <div className="fixed inset-0 z-[115] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setShowClearNotificationsConfirm(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Bell size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase">Clear Notifications?</h2>
              <p className="mt-2 mb-6 text-sm font-semibold text-slate-500">
                This will remove the current notification history.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearNotificationsConfirm(false)}
                  className="rounded-xl py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="mrs-blue-button rounded-xl py-3 text-xs font-black uppercase"
                >
                  Clear
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      <FloatingToast
        toast={
          accountError
            ? { type: "error", message: accountError }
            : accountMessage
              ? { type: "success", title: "Account Updated", message: accountMessage }
              : null
        }
        onClose={() => {
          setAccountError("");
          setAccountMessage("");
        }}
      />
    </>
  );
}
