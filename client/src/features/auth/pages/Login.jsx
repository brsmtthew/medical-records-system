import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import logo from "@assets/TGMCI_LOGO.png";
import FloatingToast from "@shared/components/FloatingToast";
import { useAuth } from "@features/auth/context/useAuth";
import {
  createStaffAccount,
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
  const [authMode, setAuthMode] = useState("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleGoogleContinue = () => {
    setError("Google sign-in is not configured yet. Use your department email and password.");
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-[#edf4f6] font-sans text-slate-950">
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
            <div className={`login-auth-panel mx-auto flex max-h-full w-full max-w-[25.5rem] flex-col bg-white px-1 text-slate-950 ${isCreateAccount ? "overflow-y-auto" : "overflow-hidden"}`}>
              <div className={`${isCreateAccount ? "mb-3" : "mb-6"} flex justify-center transition-all duration-300`}>
                <Motion.img
                  src={logo}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`${isCreateAccount ? "h-20 w-40" : "h-32 w-52"} object-contain transition-all duration-300`}
                  alt="TGMCI Logo"
                />
              </div>

              <div className={`${isCreateAccount ? "mb-3" : "mb-6"} login-mode-toggle rounded-full bg-slate-100 p-1 transition-all duration-300`}>
                <div className="relative grid grid-cols-2 gap-1">
                  <Motion.div
                    layout
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={`absolute inset-y-0 w-1/2 rounded-full bg-[#4b99bd] shadow-sm ${
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
                      className={`relative z-10 rounded-full px-4 py-3 text-xs font-black uppercase transition-colors ${
                        authMode === mode.id ? "text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${isCreateAccount ? "mb-3" : "mb-5"} text-center transition-all duration-300`}>
                <div>
                  <h2 className={`${isCreateAccount ? "text-3xl" : "text-4xl"} font-black uppercase tracking-tight text-slate-950 transition-all duration-300`}>
                    {isCreateAccount ? "Create Account" : "Login"}
                  </h2>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isCreateAccount ? "Register your staff account." : "Log in to your account."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  <Motion.div
                    key={authMode}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={isCreateAccount ? "space-y-2.5" : "space-y-3.5"}
                  >
                    {isCreateAccount && (
                      <div className="relative">
                        <UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Juan Dela Cruz"
                          aria-label="Full Name"
                          className="login-field w-full rounded-xl py-3 pl-11 pr-4 font-bold"
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
                        className="login-field w-full rounded-xl py-3 pl-11 pr-4 font-bold"
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
                        className="login-field h-12 w-full rounded-xl py-3 pl-11 pr-12 font-bold"
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        autoComplete={isCreateAccount ? "new-password" : "current-password"}
                      />
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-3 my-auto flex size-8 items-center justify-center rounded-md p-0 leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="block size-[17px]" /> : <Eye className="block size-[17px]" />}
                      </button>
                    </div>

                    {isCreateAccount && (
                      <div className="relative">
                        <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          aria-label="Confirm Password"
                          className="login-field h-12 w-full rounded-xl py-3 pl-11 pr-12 font-bold"
                          value={form.confirmPassword}
                          onChange={(e) => updateForm("confirmPassword", e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowConfirmPassword((value) => !value)}
                          className="absolute inset-y-0 right-3 my-auto flex size-8 items-center justify-center rounded-md p-0 leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff className="block size-[17px]" /> : <Eye className="block size-[17px]" />}
                        </button>
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
                      className="login-submit-button flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-black uppercase transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting
                        ? isCreateAccount
                          ? "Creating Account..."
                          : "Signing In..."
                        : isCreateAccount
                          ? "Create Account"
                          : "Log In"}
                      <ArrowRight size={18} />
                    </Motion.button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleContinue}
                      className="login-google-button flex w-full items-center justify-center gap-3 rounded-xl py-3 text-xs font-black uppercase text-slate-700 transition-all"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600">G</span>
                      Continue with Google
                    </button>

                    <p className="text-center text-xs font-semibold text-slate-500">
                      {isCreateAccount ? "Already have an account?" : "Don't have an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(isCreateAccount ? "sign-in" : "create-account");
                          setError("");
                        }}
                        className="font-black uppercase text-[#0e8aa2] hover:text-[#0f766e]"
                      >
                        {isCreateAccount ? "Sign In" : "Create"}
                      </button>
                    </p>
                  </Motion.div>
                </AnimatePresence>

                <div className={`${isCreateAccount ? "mt-2" : "mt-4"} rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all duration-300`}>
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
