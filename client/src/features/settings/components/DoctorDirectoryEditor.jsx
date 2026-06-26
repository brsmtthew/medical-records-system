import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Edit, Eye, EyeOff, Link2, LoaderCircle, Plus, Search, Stethoscope, UserPlus, X } from "lucide-react";

import FloatingToast from "@shared/components/FloatingToast";
import {
  addPhysician,
  createManagedUserAccount,
  subscribeToPhysicians,
  updatePhysician,
} from "@features/users/services/userService";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { isStrongPassword, normalizeEmail } from "@shared/utils/security";
import { doctorTypeLabel, doctorTypes } from "@shared/utils/doctors";

const emptyForm = {
  name: "",
  doctorType: "clinic",
  clinic: "",
  specialty: "",
  licenseNumber: "",
  status: "active",
};

function toForm(physician) {
  return {
    name: physician.name || "",
    doctorType: physician.doctorType || "clinic",
    clinic: physician.clinic || "",
    specialty: physician.specialty || "",
    licenseNumber: physician.licenseNumber || "",
    status: physician.status || "active",
  };
}

export default function DoctorDirectoryEditor({ isAdmin }) {
  const [physicians, setPhysicians] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [accountForm, setAccountForm] = useState({ email: "", password: "" });
  const [isLinking, setIsLinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribeToPhysicians(
      setPhysicians,
      (loadError) => setError(loadError.message || "Unable to load the doctor directory."),
    );
  }, []);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return physicians;
    return physicians.filter((physician) => (
      `${physician.name || ""} ${physician.clinic || ""} ${physician.specialty || ""} ${physician.licenseNumber || ""} ${doctorTypeLabel(physician.doctorType)}`
        .toLowerCase()
        .includes(query)
    ));
  }, [debouncedSearch, physicians]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId("");
    setError("");
    setIsFormOpen(true);
  };

  const openEdit = (physician) => {
    setForm(toForm(physician));
    setEditingId(physician.id);
    setError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setForm(emptyForm);
    setEditingId("");
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Enter the doctor's name.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await updatePhysician(editingId, form);
        setMessage(`${form.name.trim()} was updated in the doctor directory.`);
      } else {
        await addPhysician(form);
        setMessage(`${form.name.trim()} was added to the doctor directory.`);
      }
      setError("");
      closeForm();
    } catch (saveError) {
      setError(saveError.message || "Unable to save this doctor.");
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateLogin = (physician) => {
    setLinkTarget(physician);
    setAccountForm({ email: physician.linkedUserEmail || "", password: "" });
    setError("");
  };

  const closeCreateLogin = () => {
    if (isLinking) return;
    setLinkTarget(null);
    setAccountForm({ email: "", password: "" });
  };

  const submitCreateLogin = async (event) => {
    event.preventDefault();
    if (!linkTarget) return;
    const email = normalizeEmail(accountForm.email);
    if (!email) {
      setError("Enter the doctor's email address.");
      return;
    }
    if (!isStrongPassword(accountForm.password)) {
      setError("Temporary password must be at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }

    try {
      setIsLinking(true);
      const uid = await createManagedUserAccount({
        email,
        password: accountForm.password,
        fullName: linkTarget.name,
        role: "doctor",
        clinic: linkTarget.clinic,
        specialty: linkTarget.specialty,
        licenseNumber: linkTarget.licenseNumber,
      });
      await updatePhysician(linkTarget.id, { linkedUserId: uid, linkedUserEmail: email });
      setMessage(`Login account created and linked for ${linkTarget.name}.`);
      setError("");
      setLinkTarget(null);
      setAccountForm({ email: "", password: "" });
    } catch (linkError) {
      setError(linkError.message || "Unable to create the login account.");
    } finally {
      setIsLinking(false);
    }
  };

  // Doctors are never hard-deleted (patient history references them); they are
  // activated/deactivated. Inactive doctors stay in the directory but are hidden
  // from the attending-physician dropdown.
  const confirmToggle = async () => {
    if (!pendingToggle || isSaving) return;
    const physician = pendingToggle;
    const nextStatus = (physician.status || "active") === "inactive" ? "active" : "inactive";
    try {
      setIsSaving(true);
      await updatePhysician(physician.id, { status: nextStatus });
      setMessage(nextStatus === "active"
        ? `${physician.name} was activated and is back in the dropdown.`
        : `${physician.name} was set inactive and hidden from the dropdown.`);
      setError("");
      setPendingToggle(null);
    } catch (updateError) {
      setError(updateError.message || "Unable to update this doctor.");
      setPendingToggle(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="mrs-card flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-slate-700">Doctor Directory</p>
          <p className="mt-1 text-[10px] font-semibold uppercase text-slate-500">
            Register any attending physician here — including visiting or affiliated doctors with no hospital login. For doctors with a clinic, an admin can create a hospital login account directly from this directory.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
        >
          <Plus size={16} />
          Add Doctor
        </button>
      </div>

      <div className="relative shrink-0">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search doctor, clinic, specialty, or license"
          className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200">
        <div className="mrs-section-band sticky top-0 z-10 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem] border-b border-slate-100 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic / Type</p>
          <p className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</p>
        </div>

        {filtered.map((physician) => {
          const isInactive = (physician.status || "active") === "inactive";
          return (
            <div
              key={physician.id}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-xs font-black uppercase text-slate-800">{physician.name}</p>
                  {isInactive && <span className="mrs-status-badge mrs-status-neutral">Inactive</span>}
                  {physician.linkedUserId && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                      <Link2 size={11} /> Account
                    </span>
                  )}
                </div>
                {(physician.specialty || physician.licenseNumber) && (
                  <p className="mt-0.5 break-words text-[10px] font-bold uppercase text-slate-400">
                    {[physician.specialty, physician.licenseNumber].filter(Boolean).join(" · ")}
                  </p>
                )}
                {physician.linkedUserId && physician.linkedUserEmail && (
                  <p className="mt-0.5 break-words text-[10px] font-bold lowercase text-blue-600">
                    {physician.linkedUserEmail}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words text-xs font-black uppercase text-slate-700">
                  {physician.clinic || "No clinic"}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-400">
                  {doctorTypeLabel(physician.doctorType) || "Hospital Clinic"}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                {isAdmin && physician.clinic && !physician.linkedUserId && (
                  <button
                    type="button"
                    onClick={() => openCreateLogin(physician)}
                    className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100"
                    aria-label={`Create login account for ${physician.name}`}
                    title="Create login account"
                  >
                    <UserPlus size={17} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(physician)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  aria-label={`Edit ${physician.name}`}
                >
                  <Edit size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingToggle(physician)}
                  disabled={isSaving}
                  className={`rounded-lg border p-2 transition-colors disabled:opacity-60 ${
                    isInactive
                      ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                  title={isInactive ? "Activate doctor" : "Set inactive (hide from dropdown)"}
                  aria-label={`${isInactive ? "Activate" : "Deactivate"} ${physician.name}`}
                >
                  {isInactive ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <Stethoscope size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-black uppercase text-slate-700">
              {physicians.length === 0 ? "No doctors registered yet" : "No doctors match your search"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {physicians.length === 0
                ? "Add doctors here so they appear in the patient attending-physician dropdown."
                : "Try a different search term."}
            </p>
          </div>
        )}
      </div>

      {createPortal(
        <>
      {isFormOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={submitForm} className="mrs-panel flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl">
            <div className="mrs-section-band flex items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <p className="text-lg font-black uppercase text-slate-800">{editingId ? "Edit Doctor" : "Add Doctor"}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Visiting and affiliated doctors do not need a clinic.
                </p>
              </div>
              <button type="button" onClick={closeForm} className="mrs-soft-button rounded-xl p-2" aria-label="Close doctor form">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="e.g. DR. RHEA MAE"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Type</span>
                <select
                  value={form.doctorType}
                  onChange={(event) => updateForm("doctorType", event.target.value)}
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-black uppercase"
                >
                  {doctorTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic (optional)</span>
                <input
                  value={form.clinic}
                  onChange={(event) => updateForm("clinic", event.target.value)}
                  placeholder="Leave blank for visiting / affiliated doctors"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Specialty (optional)</span>
                  <input
                    value={form.specialty}
                    onChange={(event) => updateForm("specialty", event.target.value)}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">License No. (optional)</span>
                  <input
                    value={form.licenseNumber}
                    onChange={(event) => updateForm("licenseNumber", event.target.value)}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  />
                </label>
              </div>
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button type="button" onClick={closeForm} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
              >
                {isSaving && <LoaderCircle size={16} className="animate-spin" />}
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Doctor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingToggle && (() => {
        const willActivate = (pendingToggle.status || "active") === "inactive";
        return (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="mrs-panel w-full max-w-sm rounded-2xl p-6 text-center">
              <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl ${willActivate ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {willActivate ? <Eye size={26} /> : <EyeOff size={26} />}
              </div>
              <h3 className="text-lg font-black uppercase text-slate-800">
                {willActivate ? "Activate Doctor?" : "Set Doctor Inactive?"}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {willActivate
                  ? `${pendingToggle.name || "This doctor"} will be shown again in the patient attending-physician dropdown.`
                  : `${pendingToggle.name || "This doctor"} will be hidden from the dropdown. Existing patient records keep their saved physician name.`}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPendingToggle(null)}
                  disabled={isSaving}
                  className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmToggle}
                  disabled={isSaving}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg disabled:opacity-60 ${
                    willActivate ? "bg-green-600 shadow-green-600/20" : "bg-amber-500 shadow-amber-500/20"
                  }`}
                >
                  {isSaving && <LoaderCircle size={16} className="animate-spin" />}
                  {isSaving ? "Saving..." : willActivate ? "Activate" : "Set Inactive"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {linkTarget && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={submitCreateLogin} className="mrs-panel flex w-full max-w-md flex-col overflow-hidden rounded-2xl">
            <div className="mrs-section-band flex items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <p className="text-lg font-black uppercase text-slate-800">Create Login Account</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Gives this directory doctor a hospital login and links the two.
                </p>
              </div>
              <button type="button" onClick={closeCreateLogin} className="mrs-soft-button rounded-xl p-2" aria-label="Close create login">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="mrs-card rounded-xl p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor</p>
                <p className="mt-0.5 break-words text-sm font-black uppercase text-slate-800">{linkTarget.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">
                  {linkTarget.clinic}{linkTarget.specialty ? ` · ${linkTarget.specialty}` : ""}
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => { setAccountForm((current) => ({ ...current, email: event.target.value })); setError(""); }}
                  placeholder="doctor@email.com"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Temporary Password</span>
                <input
                  type="text"
                  value={accountForm.password}
                  onChange={(event) => { setAccountForm((current) => ({ ...current, password: event.target.value })); setError(""); }}
                  placeholder="At least 8 chars, upper, lower, number"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                />
              </label>
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <button type="button" onClick={closeCreateLogin} className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLinking}
                className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
              >
                {isLinking ? <LoaderCircle size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {isLinking ? "Creating..." : "Create & Link"}
              </button>
            </div>
          </form>
        </div>
      )}

      <FloatingToast
        toast={
          error && !isFormOpen && !linkTarget
            ? { type: "error", message: error }
            : message
              ? { type: "success", title: "Doctor Directory", message, action: "Doctor Directory Updated", audit: true, adminOnly: true, targetPath: "/settings" }
              : null
        }
        onClose={() => {
          setError("");
          setMessage("");
        }}
      />
        </>,
        document.body,
      )}
    </div>
  );
}
