import React, { useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import logo from "../assets/TGMCI_LOGO.png";
import { useAuth } from "../context/useAuth";
import { auth, db } from "../firebase";

const authErrorMessages = {
  "auth/email-already-in-use": "An account already exists for this email. Sign in instead.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid department email address.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/weak-password": "Use a stronger password with at least 6 characters.",
  "permission-denied": "Firestore blocked this save. Check your Firestore rules and publish them.",
  "unavailable": "Firebase is unavailable right now. Check your network connection and try again.",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authLoading, isAuthenticated, missingFirebaseConfig } = useAuth();
  const [authMode, setAuthMode] = useState("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: true,
  });
  const [error, setError] = useState("");

  const redirectTo = location.state?.from?.pathname || "/admin";
  const isCreateAccount = authMode === "create-account";

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth) {
      setError("Firebase is not configured yet. Create a .env file using the values from .env.example.");
      return;
    }

    if (isCreateAccount && !form.fullName.trim()) {
      setError("Enter your full name to create an account.");
      return;
    }

    if (!form.email.trim() || !form.password) {
      setError(
        isCreateAccount
          ? "Enter your department email and password to create an account."
          : "Enter your department email and password to continue.",
      );
      return;
    }

    if (isCreateAccount && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await setPersistence(auth, form.remember ? browserLocalPersistence : browserSessionPersistence);

      if (isCreateAccount) {
        const userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        await updateProfile(userCredential.user, {
          displayName: form.fullName.trim(),
        });
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: "staff",
          department: "Medical Records",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("Firebase authentication error:", err);
      setError(
        authErrorMessages[err.code] ||
          err.message ||
          "Unable to sign in. Please check your Firebase Auth setup.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const toggleAuthMode = () => {
    setAuthMode((current) => (current === "sign-in" ? "create-account" : "sign-in"));
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex w-1/2 bg-green-900 text-white flex-col justify-between p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.28),transparent_36%),radial-gradient(circle_at_80%_75%,rgba(74,222,128,0.18),transparent_30%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white p-3 rounded-2xl border-2 border-black">
            <img src={logo} className="w-16 h-12 object-contain" alt="TGMCI Logo" />
          </div>
          <div>
            <p className="font-black uppercase tracking-widest">TGMCI MRS</p>
            <p className="text-xs font-bold text-green-200 uppercase">Protected Records Access</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
            <ShieldCheck size={16} className="text-green-300" />
            <span className="text-xs font-black uppercase tracking-widest">Secure Local Workflow</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight uppercase leading-none">
            Medical Records Management System
          </h1>
          <p className="mt-5 text-green-100 font-medium leading-relaxed">
            Access patient registry, chart circulation, reports, and local scanned chart viewing from one protected workspace.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            ["Audit Logs", "Enabled"],
            ["Department", "Medical Records"],
            ["Session", "Monitored"],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/10 border border-white/15 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase text-green-200">{label}</p>
              <p className="text-sm font-black mt-1">{value}</p>
            </div>
          ))}
        </div>
      </Motion.div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-5 sm:p-8 bg-white lg:bg-transparent">
        <Motion.div
          layout
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-md border-2 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
        >
          <div className="mb-6">
            <div className="lg:hidden mb-5 flex items-center gap-3">
              <img src={logo} className="w-12 h-10 object-contain" alt="TGMCI Logo" />
              <div>
                <p className="font-black uppercase text-slate-800">TGMCI MRS</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">Medical Records</p>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-800 uppercase">
              {isCreateAccount ? "Create Account" : "Department Sign In"}
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              {isCreateAccount
                ? "Register your Medical Records Department account."
                : "Medical Records Department access only."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {(missingFirebaseConfig.length > 0 || error) && (
              <Motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="border-2 rounded-xl px-4 py-3 mb-5 text-sm font-bold bg-red-50 border-red-200 text-red-700"
              >
                {error ||
                  `Firebase config missing: ${missingFirebaseConfig
                    .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
                    .join(", ")}`}
              </Motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {isCreateAccount && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                  <div className="relative">
                    <UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      className="w-full border-2 border-black bg-white pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold"
                      value={form.fullName}
                      onChange={(e) => updateForm("fullName", e.target.value)}
                    />
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Department Email</label>
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@hospital.com"
                  className="w-full border-2 border-black bg-white pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
              <div className="relative">
                <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full border-2 border-black bg-white pl-11 pr-12 py-3 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isCreateAccount && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirm Password</label>
                  <div className="relative">
                    <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className="w-full border-2 border-black bg-white pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold"
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                    />
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between text-sm px-1 gap-3">
              <label className="flex items-center text-slate-600 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => updateForm("remember", e.target.checked)}
                  className="mr-2 rounded border-black text-green-600 focus:ring-green-500"
                />
                Keep signed in
              </label>
            </div>

            <Motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full bg-green-700 text-white font-black py-4 rounded-xl border-2 border-black shadow-[4px_4px_0_0_#052e16] active:shadow-none active:translate-y-1 transition-all uppercase flex items-center justify-center gap-2"
            >
              {isSubmitting
                ? isCreateAccount
                  ? "Creating Account..."
                  : "Signing In..."
                : isCreateAccount
                  ? "Create Account"
                  : "Enter Department System"}
              <ArrowRight size={18} />
            </Motion.button>

            <button
              type="button"
              onClick={toggleAuthMode}
              className="w-full text-sm font-black text-green-700 hover:text-green-900 uppercase"
            >
              {isCreateAccount
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </button>
          </form>
        </Motion.div>
      </div>
    </div>
  );
}
