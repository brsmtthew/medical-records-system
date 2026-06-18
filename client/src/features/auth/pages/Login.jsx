import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import logo from "@assets/TGMCI_LOGO.png";
import FloatingToast from "@shared/components/FloatingToast";
import { useAuth } from "@features/auth/context/useAuth";
import {
  hasAuthConfig,
  requestPasswordReset,
  signInWithEmail,
} from "@features/auth/services/authService";
import { isStrongPassword, normalizeEmail, sanitizeText } from "@shared/utils/security";
import hospitalImage from "@assets/hospital image.jpg";

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
  const authMode = "sign-in";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: false,
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

  React.useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [authMode]);

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

      await signInWithEmail({ email, password: form.password, remember: form.remember });

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
    <div className="relative h-dvh overflow-hidden bg-sky-50 font-sans text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,116,144,0.10),transparent_24rem),radial-gradient(circle_at_90%_80%,rgba(22,163,74,0.08),transparent_22rem)]" />

      <main className="relative flex h-dvh items-center px-5 py-5 sm:px-8 lg:px-10">
        <Motion.section
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="login-shell-panel mx-auto grid h-[calc(100dvh-2.5rem)] w-full max-w-7xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-slate-900/15 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <section className="relative hidden min-h-0 overflow-hidden lg:block">
            <img
              src={hospitalImage}
              alt="Tagum Global Medical Center"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(14,116,144,0.08)_38%,rgba(14,116,144,0.78)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white xl:p-12">
              <div className="mb-5 flex items-center gap-4">
                <img src={logo} className="h-20 w-32 object-contain drop-shadow-[0_12px_20px_rgba(15,23,42,0.35)]" alt="TGMCI Logo" />
                <div>
                  <p className="text-3xl font-black uppercase leading-none tracking-tight">TGMCI Records</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.26em] text-cyan-50">Medical Records System</p>
                </div>
              </div>
              <p className="max-w-lg text-sm font-semibold uppercase leading-relaxed tracking-wide text-cyan-50">
                Secure access for patient registry, chart circulation, document requests, and hospital report workflows.
              </p>
            </div>
          </section>

          <aside className="login-form-side login-auth-area relative flex min-h-0 items-center justify-center overflow-hidden p-6 sm:p-10">
            <div className="login-auth-panel mx-auto flex max-h-full w-full max-w-[24rem] flex-col overflow-y-auto bg-white text-slate-950">
              <div className="login-logo-block mb-6 overflow-hidden rounded-2xl shadow-lg shadow-cyan-900/10">
                <div className="flex flex-col items-center gap-2.5 bg-gradient-to-br from-teal-700 via-cyan-700 to-emerald-600 px-6 py-5 text-center">
                  <div className="rounded-xl bg-white px-4 py-2.5 shadow-md">
                    <Motion.img
                      src={logo}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="h-14 w-auto object-contain"
                      alt="TGMCI Logo"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-white">TGMCI Records</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-50/90">Medical Records System</p>
                  </div>
                </div>
                <div className="h-1 bg-[linear-gradient(90deg,#166534,#2563eb,#f59e0b)]" />
              </div>

              <div className="login-title-block mb-5 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {isCreateAccount ? "Create Account" : "Welcome Back"}
                </h2>
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {isCreateAccount ? "Register your staff account" : "Sign in to your account"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="login-form-stack min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  <Motion.div
                    key={authMode}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={isCreateAccount ? "space-y-3" : "space-y-3.5"}
                  >
                    {isCreateAccount && (
                      <label className="block">
                        <span className="mb-1.5 ml-0.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</span>
                        <div className="relative">
                          <UserRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Juan Dela Cruz"
                            aria-label="Full Name"
                            className="login-field h-12 w-full rounded-xl pl-11 pr-4 text-sm font-bold"
                            value={form.fullName}
                            onChange={(e) => updateForm("fullName", e.target.value)}
                          />
                        </div>
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-1.5 ml-0.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Department Email</span>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          placeholder="name@hospital.com"
                          aria-label="Department Email"
                          className="login-field h-12 w-full rounded-xl pl-11 pr-4 text-sm font-bold"
                          value={form.email}
                          onChange={(e) => updateForm("email", e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 ml-0.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Password</span>
                      <div className="relative">
                        <LockKeyhole size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          aria-label="Password"
                          className="login-field h-12 w-full rounded-xl pl-11 pr-12 text-sm font-bold"
                          value={form.password}
                          onChange={(e) => updateForm("password", e.target.value)}
                          autoComplete={isCreateAccount ? "new-password" : "current-password"}
                        />
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute inset-y-0 right-2 my-auto flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="block size-[18px]" /> : <Eye className="block size-[18px]" />}
                        </button>
                      </div>
                    </label>

                    {isCreateAccount && (
                      <label className="block">
                        <span className="mb-1.5 ml-0.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</span>
                        <div className="relative">
                          <LockKeyhole size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter your password"
                            aria-label="Confirm Password"
                            className="login-field h-12 w-full rounded-xl pl-11 pr-12 text-sm font-bold"
                            value={form.confirmPassword}
                            onChange={(e) => updateForm("confirmPassword", e.target.value)}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setShowConfirmPassword((value) => !value)}
                            className="absolute inset-y-0 right-2 my-auto flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="block size-[18px]" /> : <Eye className="block size-[18px]" />}
                          </button>
                        </div>
                      </label>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.remember}
                          onChange={(e) => updateForm("remember", e.target.checked)}
                          className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        Keep me signed in
                      </label>
                      {!isCreateAccount && (
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          className="text-xs font-black uppercase text-cyan-700 transition-colors hover:text-cyan-900"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>

                    <Motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      disabled={isSubmitting}
                      className="login-submit-button mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting
                        ? isCreateAccount
                          ? "Creating Account..."
                          : "Signing In..."
                        : isCreateAccount
                          ? "Create Account"
                          : "Log In"}
                      {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                    </Motion.button>

                    <p className="pt-1 text-center text-[11px] font-semibold text-slate-500">
                      Need an account? Contact the system administrator.
                    </p>
                  </Motion.div>
                </AnimatePresence>
              </form>

              <div className="login-status-card mt-6 flex items-center justify-center gap-2.5 rounded-xl border border-green-100 bg-green-50/70 px-4 py-3">
                <ShieldCheck size={16} className="shrink-0 text-green-600" />
                <p className="text-[10px] font-black uppercase tracking-wider text-green-700">
                  {isCreateAccount ? "New accounts start as records staff" : "Secured records department access"}
                </p>
              </div>
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
