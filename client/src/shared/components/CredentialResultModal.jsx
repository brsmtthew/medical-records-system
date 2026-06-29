import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, KeyRound, X } from "lucide-react";

// Shown after an admin creates a managed account. Displays the email and the
// auto-generated temporary password so the admin can hand them to the user, who
// is then forced to set their own password on first sign-in.
export default function CredentialResultModal({ name, email, temporaryPassword, onClose }) {
  const [copiedField, setCopiedField] = useState("");

  const copy = async (field, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? "" : current)), 1500);
    } catch {
      // Clipboard may be unavailable; the admin can still read and type the value.
    }
  };

  const field = (label, fieldKey, value) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="break-all font-mono text-sm font-bold text-slate-800">{value}</p>
        <button
          type="button"
          onClick={() => copy(fieldKey, value)}
          className="mrs-soft-button inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase"
          aria-label={`Copy ${label}`}
        >
          {copiedField === fieldKey ? <Check size={13} /> : <Copy size={13} />}
          {copiedField === fieldKey ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mrs-panel w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-slate-800">Account Created</h2>
              <p className="text-xs font-semibold text-slate-500">{name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="mrs-soft-button rounded-xl p-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm font-semibold text-slate-500">
          Share these sign-in details with the user. They will be required to set their own password the first time they sign in.
        </p>

        <div className="mt-4 space-y-2">
          {field("Email", "email", email)}
          {field("Temporary Password", "password", temporaryPassword)}
        </div>

        <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-700">
          This temporary password is shown only once and is not stored. Copy it now.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mrs-primary-button mt-5 w-full rounded-xl px-4 py-3 text-xs font-black uppercase"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
