import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

import { auth } from "@/firebaseClient";
import { signOut } from "firebase/auth";
import { completeFirstLoginPasswordSetup } from "@features/auth/services/authService";
import { clearPersistentSignIn } from "@services/sessionService";
import { isStrongPassword } from "@shared/utils/security";

// Shown by ProtectedRoute when the signed-in account still has mustChangePassword.
// Blocks the dashboard until the user replaces their admin-issued temporary password.
export default function FirstLoginPasswordSetup() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    if (!currentPassword) {
      setError("Enter the temporary password you signed in with.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError("New password must be at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from the temporary one.");
      return;
    }

    try {
      setIsSaving(true);
      await completeFirstLoginPasswordSetup({ currentPassword, newPassword });
      // No navigation needed: the profile snapshot clears mustChangePassword and
      // ProtectedRoute re-renders the requested page automatically.
    } catch (saveError) {
      setError(saveError.message || "Unable to set your password.");
    } finally {
      setIsSaving(false);
    }
  };

  const signOutNow = () => {
    clearPersistentSignIn();
    if (auth) signOut(auth).catch(() => {});
  };

  return (
    <div className="mrs-shell min-h-screen flex items-center justify-center p-4 font-sans">
      <form onSubmit={submit} className="mrs-panel w-full max-w-md rounded-2xl p-6">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-center text-xl font-black uppercase text-slate-800">Set Up Your Password</h1>
        <p className="mt-2 text-center text-sm font-semibold text-slate-500">
          For security, choose your own password before entering the workspace. You signed in with a temporary password issued by the administrator.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Temporary Password</span>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => { setCurrentPassword(event.target.value); setError(""); }}
              autoComplete="current-password"
              className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</span>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(event) => { setNewPassword(event.target.value); setError(""); }}
              autoComplete="new-password"
              placeholder="At least 8 chars, upper, lower, number"
              className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm New Password</span>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }}
              autoComplete="new-password"
              className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowPasswords((visible) => !visible)}
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="mrs-primary-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
        >
          {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {isSaving ? "Saving..." : "Save Password & Continue"}
        </button>

        <button
          type="button"
          onClick={signOutNow}
          className="mrs-soft-button mt-2 w-full rounded-xl px-4 py-3 text-xs font-black uppercase"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
