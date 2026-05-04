import React, { useEffect, useState } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Calendar,
  Camera,
  ChevronDown,
  Circle,
  CheckCircle2,
  Info,
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
import {
  maxNotificationLogItems,
  normalizeNotification,
  readStoredBellNotifications,
  readStoredUnreadNotifications,
  writeStoredBellNotifications,
  writeStoredUnreadNotifications,
} from "../utils/notificationLog";
import { readSystemSettings, saveSystemSettings } from "../utils/systemSettings";

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatNotificationTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function notificationIcon(type) {
  if (type === "success") return CheckCircle2;
  if (type === "error") return TriangleAlert;
  return Info;
}

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
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
    phone: "",
    position: "",
    department: "Medical Records",
    photoDataUrl: "",
  });
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [appearanceMode, setAppearanceMode] = useState(() => readSystemSettings().appearanceMode);

  useEffect(() => {
    if (!currentUser || !db) return undefined;

    return onSnapshot(doc(db, "users", currentUser.uid), (snapshot) => {
      const profile = snapshot.exists() ? snapshot.data() : {};
      setAccountProfile(profile);
      setAccountForm({
        fullName: profile.fullName || currentUser.displayName || "",
        phone: profile.phone || "",
        position: profile.position || "",
        department: profile.department || "Medical Records",
        photoDataUrl: profile.photoDataUrl || "",
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
    const handleToast = (event) => {
      const notification = normalizeNotification(event.detail || {});
      if (!notification?.message) return;

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
  }, []);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    setShowSignOutConfirm(false);
    navigate("/", { replace: true });
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadNotifications(0);
    setShowClearNotificationsConfirm(false);
    setShowNotifications(false);
  };

  const toggleAppearanceMode = () => {
    const currentSettings = readSystemSettings();
    const nextMode = currentSettings.appearanceMode === "dark" ? "light" : "dark";
    const nextSettings = { ...currentSettings, appearanceMode: nextMode };

    saveSystemSettings(nextSettings);
    setAppearanceMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode === "dark");
    document.documentElement.classList.toggle(
      "soft-light",
      nextMode !== "dark" && nextSettings.lightComfortMode === "soft",
    );
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
  };

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

    try {
      await updateProfile(currentUser, {
        displayName: accountForm.fullName.trim(),
      });
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          fullName: accountForm.fullName.trim(),
          email: currentUser.email || "",
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
      setShowAccountSettings(false);
    } catch (error) {
      setAccountError(error.message || "Unable to save account settings.");
    }
  };

  const displayName = accountProfile?.fullName || currentUser?.displayName || "Administrator";
  const displayEmail = currentUser?.email || "Medical Records";
  const photoDataUrl = accountProfile?.photoDataUrl || accountForm.photoDataUrl;
  const initials = getInitials(displayName);

  return (
    <>
    <div className="mrs-navbar w-full border-b border-blue-100/80 bg-gradient-to-r from-blue-50/95 via-white/95 to-green-50/90 px-3 py-2.5 backdrop-blur-xl sm:px-4 md:px-5 2xl:px-6 2xl:py-3 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <Motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2.5 mrs-soft-button rounded-xl"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-slate-800" />
        </Motion.button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-[12px] sm:text-base 2xl:text-lg font-black tracking-tight text-slate-900 leading-tight sm:leading-none truncate">
            TAGUM GLOBAL <span className="text-blue-700">MEDICAL CENTER</span> INC.
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="hidden sm:inline bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
              MEDICAL RECORDS MANAGEMENT SYSTEM
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3 2xl:gap-6">
        <div className="hidden xl:flex items-center gap-2 text-slate-500 px-3 2xl:px-4 border-r border-slate-200">
          <Calendar size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
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
            className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-green-200 hover:bg-green-50"
            aria-label="Open notifications"
          >
            <Bell size={19} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black leading-4 text-white shadow-sm">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
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
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearNotificationsConfirm(true)}
                      className="rounded-lg px-2 py-1 text-[10px] font-black uppercase text-slate-500 hover:bg-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-[min(12.5rem,calc(100dvh-9rem))] divide-y divide-slate-100 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-black uppercase text-slate-700">No notifications yet</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Toast messages will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 2).map((notification) => {
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
          className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50"
          aria-label={appearanceMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={appearanceMode === "dark" ? "Light mode" : "Dark mode"}
        >
          {appearanceMode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="relative">
          <Motion.button
            whileHover={{ y: -1 }}
            onClick={() => {
              setShowProfile((value) => !value);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 pr-3 rounded-xl cursor-pointer shadow-sm hover:border-green-200 hover:bg-green-50/50"
          >
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm overflow-hidden">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials || "AD"
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="block max-w-28 truncate whitespace-nowrap text-sm font-black text-slate-800 leading-tight 2xl:max-w-40">
                  {displayName}
                </span>
                <Circle size={8} className="fill-green-500 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
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
              className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl p-5 sm:p-6"
            >
              <button
                onClick={() => setShowAccountSettings(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100"
                aria-label="Close account settings"
              >
                <X size={20} />
              </button>

              <h2 className="pr-9 text-xl font-black text-slate-800 uppercase mb-1 sm:text-2xl">Account Settings</h2>
              <p className="text-xs font-bold text-slate-400 uppercase mb-5">
                Update your profile details and account photo.
              </p>

              <form onSubmit={handleAccountSave} className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                  <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-green-700 text-2xl font-black text-white shadow-lg shadow-green-900/10">
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
                  <label className="mrs-soft-button inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase">
                    <Camera size={17} />
                    Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Full Name</span>
                    <input
                      value={accountForm.fullName}
                      onChange={(event) => setAccountForm({ ...accountForm, fullName: event.target.value })}
                      className="mrs-field w-full rounded-xl p-3 font-bold"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Position</span>
                    <input
                      value={accountForm.position}
                      onChange={(event) => setAccountForm({ ...accountForm, position: event.target.value })}
                      placeholder="Records Staff"
                      className="mrs-field w-full rounded-xl p-3 font-bold"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Phone</span>
                    <input
                      value={accountForm.phone}
                      onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })}
                      placeholder="Contact number"
                      className="mrs-field w-full rounded-xl p-3 font-bold"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Department</span>
                    <input
                      value={accountForm.department}
                      onChange={(event) => setAccountForm({ ...accountForm, department: event.target.value })}
                      className="mrs-field w-full rounded-xl p-3 font-bold"
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
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
