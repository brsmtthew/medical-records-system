import React, { useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import logo from "../assets/TGMCI_LOGO.png";
import FloatingToast from "../components/FloatingToast";
import { useAuth } from "../context/useAuth";
import { auth, db } from "../firebaseClient";
import { isStrongPassword, normalizeEmail, sanitizeText } from "../utils/security";

const authErrorMessages = {
  "auth/email-already-in-use": "An account already exists for this email. Sign in instead.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid department email address.",
  "auth/missing-email": "Enter your email first, then click forgot password.",
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
  const [notice, setNotice] = useState("");
  const [isConfigToastDismissed, setIsConfigToastDismissed] = useState(false);
  const [isSecurityToastDismissed, setIsSecurityToastDismissed] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";
  const isCreateAccount = authMode === "create-account";

  React.useEffect(() => {
    // Sends already-authenticated users directly to the protected workspace.
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirectTo]);

  // Validates the current auth form, then signs in or creates the Firebase account.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth) {
      setError("Firebase is not configured yet. Create a .env file using the values from .env.example.");
      return;
    }

    const email = normalizeEmail(form.email);
    const fullName = sanitizeText(form.fullName, { maxLength: 120 });

    if (isCreateAccount && !fullName) {
      setError("Enter your full name to create an account.");
      return;
    }

    if (!email || !form.password) {
      setError(
        isCreateAccount
          ? "Enter your department email and password to create an account."
          : "Enter your department email and password to continue.",
      );
      return;
    }

    if (isCreateAccount && !isStrongPassword(form.password)) {
      setError("Use at least 8 characters with uppercase, lowercase, and a number.");
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, form.password);
        await updateProfile(userCredential.user, {
          displayName: fullName,
        });
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          fullName,
          email,
          role: "staff",
          accountStatus: "active",
          department: "Medical Records",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, form.password);
        if (db) {
          await setDoc(
            doc(db, "users", userCredential.user.uid),
            {
              uid: userCredential.user.uid,
              email,
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
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

  // Updates one form field and clears stale validation errors.
  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  };

  // Sends a Firebase reset email for staff who forgot their password.
  const handlePasswordReset = async () => {
    if (!auth) {
      setError("Firebase is not configured yet.");
      return;
    }

    const email = normalizeEmail(form.email);
    if (!email) {
      setError("Enter your email first, then click forgot password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setNotice("If the staff email exists, Firebase will send a secure password reset email.");
      setError("");
    } catch (err) {
      setError(authErrorMessages[err.code] || err.message || "Unable to send the password reset email.");
    }
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-900/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-emerald-950/50 to-transparent" />

      <main className="relative flex min-h-dvh items-center justify-center px-3 py-4 sm:p-6">
        <Motion.section
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[2rem] lg:grid-cols-[0.92fr_1.08fr]"
        >
          <aside className="relative border-b border-white/10 bg-slate-900/80 p-4 sm:p-7 lg:border-b-0 lg:border-r">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-white/50" />
            <div className="flex h-full min-h-0 flex-col justify-between gap-7 sm:min-h-[26rem]">
              <div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 shadow-xl shadow-black/20 sm:h-24 sm:w-32 sm:rounded-3xl sm:p-3" style={{ backgroundColor: "white" }}>
                    <img src={logo} className="h-full w-full object-contain" alt="TGMCI Logo" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-black uppercase leading-tight text-white sm:text-2xl">
                      Tagum Global Medical Center Inc.
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                      Medical Records System
                    </p>
                  </div>
                </div>

                <div className="mt-7 max-w-lg sm:mt-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 sm:px-4">
                    <ShieldCheck size={16} className="text-emerald-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                      Records Vault Portal
                    </span>
                  </div>
                  <h1 className="mt-5 text-3xl font-black uppercase leading-none tracking-tight sm:mt-6 sm:text-5xl">
                    Access the records workspace.
                  </h1>
                  <p className="mt-5 max-w-md text-sm font-semibold leading-relaxed text-slate-300">
                    A secure entry point for patient registry, chart tracking, scanned chart viewing, and report activity logs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { label: "Audit Trail", value: "Tracked", icon: ClipboardCheck },
                  { label: "Session Lock", value: "Enabled", icon: LockKeyhole },
                  { label: "Records Unit", value: "Authorized", icon: Building2 },
                ].map((item, index) => (
                  <Motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.06 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:p-4"
                  >
                    <item.icon size={18} className="mb-3 text-emerald-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-black uppercase text-white">{item.value}</p>
                  </Motion.div>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex items-center justify-center bg-slate-50 p-4 text-slate-900 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <div className="relative grid grid-cols-2 gap-1">
                  <Motion.div
                    layout
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={`absolute inset-y-0 w-1/2 rounded-xl bg-slate-950 ${
                      isCreateAccount ? "left-1/2" : "left-0"
                    }`}
                  />
                  {[
                    { id: "sign-in", label: "Sign In" },
                    { id: "create-account", label: "Create" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setAuthMode(mode.id);
                        setError("");
                      }}
                      className={`relative z-10 rounded-xl px-4 py-3 text-xs font-black uppercase transition-colors ${
                        authMode === mode.id ? "text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-green-50 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {isCreateAccount ? "Account Setup" : "Secure Login"}
                      </p>
                      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950 sm:text-3xl">
                        {isCreateAccount ? "Create Account" : "Department Sign In"}
                      </h2>
                    </div>
                    <Motion.div
                      key={authMode}
                      initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 20 }}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm"
                    >
                      {isCreateAccount ? <UserRound size={24} /> : <ShieldCheck size={24} />}
                    </Motion.div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                  <AnimatePresence mode="wait" initial={false}>
                    <Motion.div
                      key={authMode}
                      initial={{ opacity: 0, y: 18, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -14, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      {isCreateAccount && (
                        <div className="space-y-1">
                          <div className="relative">
                            <UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Juan Dela Cruz"
                              aria-label="Full Name"
                              className="mrs-field w-full bg-white pl-11 pr-4 py-3 rounded-xl font-bold"
                              value={form.fullName}
                              onChange={(e) => updateForm("fullName", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="relative">
                          <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            placeholder="name@hospital.com"
                            aria-label="Department Email"
                            className="mrs-field w-full bg-white pl-11 pr-4 py-3 rounded-xl font-bold"
                            value={form.email}
                            onChange={(e) => updateForm("email", e.target.value)}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            aria-label="Password"
                            className="mrs-field w-full bg-white pl-11 pr-12 py-3 rounded-xl font-bold"
                            value={form.password}
                            onChange={(e) => updateForm("password", e.target.value)}
                            autoComplete={isCreateAccount ? "new-password" : "current-password"}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 hover:bg-slate-100"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>

                      {isCreateAccount && (
                        <div className="space-y-1">
                          <div className="relative">
                            <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              aria-label="Confirm Password"
                              className="mrs-field w-full bg-white pl-11 pr-4 py-3 rounded-xl font-bold"
                              value={form.confirmPassword}
                              onChange={(e) => updateForm("confirmPassword", e.target.value)}
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 px-1 text-sm">
                        <label className="flex cursor-pointer items-center font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={form.remember}
                            onChange={(e) => updateForm("remember", e.target.checked)}
                            className="mr-2 rounded border-black text-green-600 focus:ring-green-500"
                          />
                          Keep signed in
                        </label>
                        {!isCreateAccount && (
                          <button
                            type="button"
                            onClick={handlePasswordReset}
                            className="text-xs font-black uppercase text-blue-700 hover:text-blue-900"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>

                      <Motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSubmitting}
                        className="mrs-primary-button flex w-full items-center justify-center gap-2 rounded-xl py-4 font-black uppercase transition-all"
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
                    </Motion.div>
                  </AnimatePresence>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                        <HeartPulse size={19} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                        <p className="text-xs font-bold text-slate-600">
                          {isCreateAccount
                            ? "New accounts start as staff and can be reviewed later."
                            : "Records department access is ready."}
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Motion.section>
      </main>
      <FloatingToast
        toast={
          error
            ? { type: "error", message: error }
            : notice
              ? { type: "success", message: notice }
            : location.state?.securityMessage && !isSecurityToastDismissed
              ? { type: "info", message: location.state.securityMessage }
            : missingFirebaseConfig.length > 0 && !isConfigToastDismissed
              ? {
                  type: "error",
                  title: "Firebase Config Missing",
                  message: `Missing: ${missingFirebaseConfig
                    .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
                    .join(", ")}`,
                }
              : null
        }
        duration={error ? 3200 : 0}
        onClose={() => {
          setError("");
          setNotice("");
          setIsSecurityToastDismissed(true);
          setIsConfigToastDismissed(true);
        }}
      />
    </div>
  );
}
