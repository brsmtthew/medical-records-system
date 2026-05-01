import React, { useEffect, useState } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  Circle,
  LogOut,
  MapPin,
  Menu,
  Save,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { auth, db } from "../firebase";

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

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
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

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    setShowSignOutConfirm(false);
    navigate("/", { replace: true });
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
    } catch (error) {
      setAccountError(error.message || "Unable to save account settings.");
    }
  };

  const displayName = accountProfile?.fullName || currentUser?.displayName || "Administrator";
  const displayEmail = currentUser?.email || "Medical Records";
  const photoDataUrl = accountProfile?.photoDataUrl || accountForm.photoDataUrl;
  const initials = getInitials(displayName);

  return (
    <div className="w-full bg-white border-b-2 border-black px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <Motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2.5 bg-white border-2 border-black rounded-xl hover:bg-green-50 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-slate-800" />
        </Motion.button>

        <div className="hidden sm:flex bg-green-600 p-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <Building2 size={22} className="text-white" />
        </div>

        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 leading-none truncate">
            TAGUM GLOBAL <span className="text-green-600">MEDICAL CENTER</span> INC.
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="hidden sm:inline bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
              MEDICAL RECORDS MANAGEMENT SYSTEM
            </span>
            <div className="hidden md:flex items-center gap-1 text-slate-400">
              <MapPin size={10} />
              <span className="text-[10px] font-bold">Tagum City, PH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden lg:flex items-center gap-2 text-slate-500 px-4 border-r border-slate-200">
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
          <Motion.button
            whileHover={{ y: -1 }}
            onClick={() => setShowProfile((value) => !value)}
            className="flex items-center gap-3 bg-slate-50 border-2 border-black p-1.5 pr-3 rounded-xl cursor-pointer"
          >
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white font-black text-xs border border-black shadow-sm overflow-hidden">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials || "AD"
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-800 leading-tight max-w-36 truncate">
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
                className="absolute right-0 mt-3 w-64 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden"
              >
                <div className="p-4 border-b-2 border-black bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-700 text-white border border-black overflow-hidden flex items-center justify-center">
                      {photoDataUrl ? (
                        <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={25} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 truncate">{displayName}</p>
                      <p className="text-xs font-bold text-slate-500 truncate">{displayEmail}</p>
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

      <AnimatePresence>
        {showAccountSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowAccountSettings(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              className="relative bg-white border-4 border-black rounded-[2rem] p-6 w-full max-w-xl shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
            >
              <button
                onClick={() => setShowAccountSettings(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100"
                aria-label="Close account settings"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-black text-slate-800 uppercase mb-1">Account Settings</h2>
              <p className="text-xs font-bold text-slate-400 uppercase mb-5">
                Update your profile details and account photo.
              </p>

              <form onSubmit={handleAccountSave} className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                  <div className="w-24 h-24 rounded-2xl bg-green-700 border-2 border-black overflow-hidden flex items-center justify-center text-white font-black text-2xl">
                    {accountForm.photoDataUrl ? (
                      <img src={accountForm.photoDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials || "AD"
                    )}
                  </div>
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-black bg-white text-xs font-black uppercase cursor-pointer hover:bg-slate-50">
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
                      className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Position</span>
                    <input
                      value={accountForm.position}
                      onChange={(event) => setAccountForm({ ...accountForm, position: event.target.value })}
                      placeholder="Records Staff"
                      className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Phone</span>
                    <input
                      value={accountForm.phone}
                      onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value })}
                      placeholder="Contact number"
                      className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Department</span>
                    <input
                      value={accountForm.department}
                      onChange={(event) => setAccountForm({ ...accountForm, department: event.target.value })}
                      className="w-full border-2 border-black rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </label>
                </div>

                {accountError && (
                  <div className="border-2 border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-xs font-black">
                    {accountError}
                  </div>
                )}
                {accountMessage && (
                  <div className="border-2 border-green-200 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-xs font-black">
                    {accountMessage}
                  </div>
                )}

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
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-700 text-white text-xs font-black uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSignOutConfirm(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              className="relative bg-white border-4 border-black rounded-[2rem] p-7 w-full max-w-sm shadow-[12px_12px_0_0_rgba(0,0,0,1)] text-center"
            >
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-50 text-red-600 border-2 border-black flex items-center justify-center">
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
                  className="py-3 rounded-xl bg-red-600 text-white text-xs font-black uppercase border-2 border-black shadow-[4px_4px_0_0_#7f1d1d] active:translate-y-1 active:shadow-none"
                >
                  Sign Out
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
