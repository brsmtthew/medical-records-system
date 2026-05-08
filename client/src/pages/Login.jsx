import React, { useState } from "react";
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
import {
  createStaffAccount,
  hasAuthConfig,
  requestPasswordReset,
  signInWithEmail,
} from "../services/authService";
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
  const { authLoading, isAuthenticated, invalidFirebaseConfig = [], missingFirebaseConfig } = useAuth();
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

    if (!hasAuthConfig()) {
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

      if (isCreateAccount) {
        await createStaffAccount({
          fullName,
          email,
          password: form.password,
          remember: form.remember,
        });
      } else {
        await signInWithEmail({ email, password: form.password, remember: form.remember });
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
    if (!hasAuthConfig()) {
      setError("Firebase is not configured yet.");
      return;
    }

    const email = normalizeEmail(form.email);
    if (!email) {
      setError("Enter your email first, then click forgot password.");
      return;
    }

    try {
      await requestPasswordReset(email);
      setNotice("If the staff email exists, Firebase will send a secure password reset email.");
      setError("");
    } catch (err) {
      setError(authErrorMessages[err.code] || err.message || "Unable to send the password reset email.");
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#166534,#2563eb,#f59e0b)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(21,128,61,0.22),transparent)]" />

      <main className="relative flex h-dvh items-center px-4 py-5 sm:px-6 lg:px-8">
        <Motion.section
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto grid h-[calc(100dvh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1fr_25rem]"
        >
          <section className="relative hidden min-h-0 overflow-hidden lg:flex lg:flex-col">
            <div className="absolute right-0 top-0 h-full w-2/5 bg-[linear-gradient(135deg,rgba(22,101,52,0.26),rgba(37,99,235,0.18),rgba(245,158,11,0.12))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.13),transparent_28rem)]" />
            <div className="absolute right-8 top-8 z-10 flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-emerald-100">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Portal</span>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col justify-between p-6 xl:p-8">
              <header className="flex shrink-0 items-center gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white p-2 shadow-xl shadow-black/20">
                    <img src={logo} className="h-full w-full object-contain" alt="TGMCI Logo" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black uppercase tracking-wide text-white">TGMCI</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Medical Records</p>
                  </div>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 items-center py-5">
                <div className="max-w-2xl">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-lg border border-blue-300/25 bg-blue-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-100">
                    <Building2 size={15} />
                    Records Workspace
                  </p>
                  <h1 className="text-4xl font-black uppercase leading-[0.93] tracking-tight text-white xl:text-5xl">
                    Records command center.
                  </h1>
                  <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-slate-300 xl:text-base">
                    One focused entry point for patient registry, chart circulation, viewing, and reporting.
                  </p>
                  <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
                    {[
                      { label: "Patient Registry", value: "Organized", icon: UserRound },
                      { label: "Chart Flow", value: "Visible", icon: ClipboardCheck },
                      { label: "Access Layer", value: "Protected", icon: LockKeyhole },
                    ].map((item, index) => (
                      <Motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + index * 0.05 }}
                        className="rounded-lg border border-white/10 bg-white/[0.07] p-3"
                      >
                        <item.icon size={17} className="mb-3 text-emerald-200" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                        <p className="mt-1 text-xs font-black uppercase text-white">{item.value}</p>
                      </Motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 flex-col gap-3 border-t border-white/10 pt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Medical Records Management System</span>
                <span>Audit Trail / Session Control / Firebase Auth</span>
              </footer>
            </div>
          </section>

          <aside className="login-auth-area relative flex min-h-0 items-center justify-center border-white/10 p-4 sm:p-5 lg:border-l">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(14,116,144,0.12),transparent_24rem)]" />
            <div className="login-auth-panel mx-auto flex max-h-full w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/20 sm:p-5 lg:max-w-none">
              <div className="mb-3 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                  <img src={logo} className="h-full w-full object-contain" alt="TGMCI Logo" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-slate-950">TGMCI</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medical Records</p>
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <div className="relative grid grid-cols-2 gap-1">
                  <Motion.div
                    layout
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={`absolute inset-y-0 w-1/2 rounded-md bg-slate-950 ${
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
                      className={`relative z-10 rounded-md px-4 py-3 text-xs font-black uppercase transition-colors ${
                        authMode === mode.id ? "text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {isCreateAccount ? "Staff Account Setup" : "Staff Access"}
                  </p>
                  <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950 xl:text-2xl">
                    {isCreateAccount ? "Create Staff Account" : "Department Sign In"}
                  </h2>
                </div>
                <Motion.div
                  key={authMode}
                  initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"
                >
                  {isCreateAccount ? <UserRound size={24} /> : <ShieldCheck size={24} />}
                </Motion.div>
              </div>

              <form onSubmit={handleSubmit} className="min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  <Motion.div
                    key={authMode}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    {isCreateAccount && (
                      <div className="relative">
                        <UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Juan Dela Cruz"
                          aria-label="Full Name"
                          className="login-field w-full rounded-lg py-2.5 pl-11 pr-4 font-bold"
                          value={form.fullName}
                          onChange={(e) => updateForm("fullName", e.target.value)}
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="name@hospital.com"
                        aria-label="Department Email"
                        className="login-field w-full rounded-lg py-2.5 pl-11 pr-4 font-bold"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        autoComplete="email"
                      />
                    </div>

                    <div className="relative">
                      <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        aria-label="Password"
                        className="login-field w-full rounded-lg py-2.5 pl-11 pr-12 font-bold"
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        autoComplete={isCreateAccount ? "new-password" : "current-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    {isCreateAccount && (
                      <div className="relative">
                        <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          aria-label="Confirm Password"
                          className="login-field w-full rounded-lg py-2.5 pl-11 pr-4 font-bold"
                          value={form.confirmPassword}
                          onChange={(e) => updateForm("confirmPassword", e.target.value)}
                          autoComplete="new-password"
                        />
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
                      className="mrs-primary-button flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-black uppercase transition-all disabled:cursor-not-allowed disabled:opacity-70"
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

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
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
          </aside>
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
            : (missingFirebaseConfig.length > 0 || invalidFirebaseConfig.length > 0) && !isConfigToastDismissed
              ? {
                  type: "error",
                  title: "Firebase Config Issue",
                  message: `${missingFirebaseConfig.length > 0 ? `Missing: ${missingFirebaseConfig
                    .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
                    .join(", ")}` : ""}${invalidFirebaseConfig.length > 0 ? ` Invalid: ${invalidFirebaseConfig
                    .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
                    .join(", ")}` : ""}`.trim(),
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
