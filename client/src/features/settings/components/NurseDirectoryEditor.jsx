import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Edit, Eye, EyeOff, HeartPulse, Link2, LoaderCircle, Plus, Search, UserPlus, X } from "lucide-react";

import CredentialResultModal from "@shared/components/CredentialResultModal";
import FloatingToast from "@shared/components/FloatingToast";
import {
  addNurse,
  createManagedUserAccount,
  fallbackAdmissionLocations,
  fallbackOutpatientDepartments,
  subscribeToAdmissionLocations,
  subscribeToNurses,
  subscribeToOutpatientDepartments,
  updateNurse,
} from "@features/users/services/userService";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { normalizeEmail } from "@shared/utils/security";

const departmentTypes = [
  { value: "admission", label: "Admission (Inpatient)" },
  { value: "outpatient", label: "Outpatient" },
];

const emptyForm = {
  name: "",
  departmentType: "admission",
  department: "",
  licenseNumber: "",
  status: "active",
};

export default function NurseDirectoryEditor({ isAdmin }) {
  const [nurses, setNurses] = useState([]);
  const [admissionLocations, setAdmissionLocations] = useState([]);
  const [outpatientDepartments, setOutpatientDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [accountForm, setAccountForm] = useState({ email: "" });
  const [createdAccount, setCreatedAccount] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribeToNurses(
      setNurses,
      (loadError) => setError(loadError.message || "Unable to load the nurse directory."),
    );
  }, []);

  // Nurses are assigned to the same admission and outpatient departments managed
  // in the Department Editor, so the field suggests those instead of a static list.
  useEffect(() => {
    const unsubscribeAdmission = subscribeToAdmissionLocations(setAdmissionLocations, () => {});
    const unsubscribeOutpatient = subscribeToOutpatientDepartments(setOutpatientDepartments, () => {});
    return () => {
      unsubscribeAdmission();
      unsubscribeOutpatient();
    };
  }, []);

  const admissionOptions = useMemo(() => (
    admissionLocations.length
      ? [...new Set(admissionLocations.map((location) => location.name).filter(Boolean))]
      : fallbackAdmissionLocations
  ), [admissionLocations]);

  const outpatientOptions = useMemo(() => (
    outpatientDepartments.length
      ? [...new Set(outpatientDepartments.map((department) => department.name).filter(Boolean))]
      : fallbackOutpatientDepartments
  ), [outpatientDepartments]);

  // Options for the currently selected assignment type, with the saved value kept
  // even if it has since been removed from the Department Editor.
  const currentDepartmentOptions = useMemo(() => {
    const base = form.departmentType === "outpatient" ? outpatientOptions : admissionOptions;
    const withSaved = form.department && !base.includes(form.department)
      ? [form.department, ...base]
      : base;
    return [...withSaved].sort((first, second) => first.localeCompare(second));
  }, [form.departmentType, form.department, admissionOptions, outpatientOptions]);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return nurses;
    return nurses.filter((nurse) => (
      `${nurse.name || ""} ${nurse.department || ""} ${nurse.licenseNumber || ""}`
        .toLowerCase()
        .includes(query)
    ));
  }, [debouncedSearch, nurses]);

  // Older records may lack departmentType; infer it from which list holds the value.
  const inferDepartmentType = (nurse) => {
    if (nurse.departmentType) return nurse.departmentType;
    if (outpatientOptions.includes(nurse.department) && !admissionOptions.includes(nurse.department)) {
      return "outpatient";
    }
    return "admission";
  };

  const updateForm = (key, value) => {
    setForm((current) => {
      // Switching assignment type clears the department so a stale value from the
      // other list can't be saved against the wrong type.
      if (key === "departmentType" && value !== current.departmentType) {
        return { ...current, departmentType: value, department: "" };
      }
      return { ...current, [key]: value };
    });
    setError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId("");
    setError("");
    setIsFormOpen(true);
  };

  const openEdit = (nurse) => {
    setForm({
      name: nurse.name || "",
      departmentType: inferDepartmentType(nurse),
      department: nurse.department || "",
      licenseNumber: nurse.licenseNumber || "",
      status: nurse.status || "active",
    });
    setEditingId(nurse.id);
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
      setError("Enter the nurse's name.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await updateNurse(editingId, form);
        setMessage(`${form.name.trim()} was updated in the nurse directory.`);
      } else {
        await addNurse(form);
        setMessage(`${form.name.trim()} was added to the nurse directory.`);
      }
      setError("");
      closeForm();
    } catch (saveError) {
      setError(saveError.message || "Unable to save this nurse.");
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateLogin = (nurse) => {
    setLinkTarget(nurse);
    setAccountForm({ email: nurse.linkedUserEmail || "" });
    setError("");
  };

  const closeCreateLogin = () => {
    if (isLinking) return;
    setLinkTarget(null);
    setAccountForm({ email: "" });
  };

  const submitCreateLogin = async (event) => {
    event.preventDefault();
    if (!linkTarget) return;
    const email = normalizeEmail(accountForm.email);
    if (!email) {
      setError("Enter the nurse's email address.");
      return;
    }
    try {
      setIsLinking(true);
      const { uid, temporaryPassword } = await createManagedUserAccount({
        email,
        fullName: linkTarget.name,
        role: "nurse",
        department: linkTarget.department,
        licenseNumber: linkTarget.licenseNumber,
      });
      await updateNurse(linkTarget.id, { linkedUserId: uid, linkedUserEmail: email });
      setCreatedAccount({ name: linkTarget.name, email, temporaryPassword });
      setError("");
      setLinkTarget(null);
      setAccountForm({ email: "" });
    } catch (linkError) {
      setError(linkError.message || "Unable to create the login account.");
    } finally {
      setIsLinking(false);
    }
  };

  // Nurses are never hard-deleted (chart/request history references them); they are
  // activated/deactivated instead. Inactive nurses stay in the directory but are flagged.
  const confirmToggle = async () => {
    if (!pendingToggle || isSaving) return;
    const nurse = pendingToggle;
    const nextStatus = (nurse.status || "active") === "inactive" ? "active" : "inactive";
    try {
      setIsSaving(true);
      await updateNurse(nurse.id, { status: nextStatus });
      setMessage(nextStatus === "active"
        ? `${nurse.name} was reactivated.`
        : `${nurse.name} was set inactive.`);
      setError("");
      setPendingToggle(null);
    } catch (updateError) {
      setError(updateError.message || "Unable to update this nurse.");
      setPendingToggle(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="mrs-card flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-slate-700">Nurse Directory</p>
          <p className="mt-1 text-[10px] font-semibold uppercase text-slate-500">
            Register nurses here as the single source of truth. An admin can create a hospital login account directly from this directory and link the two.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
        >
          <Plus size={16} />
          Add Nurse
        </button>
      </div>

      <div className="relative shrink-0">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search nurse, department, or license"
          className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200">
        <div className="mrs-section-band sticky top-0 z-10 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem] border-b border-slate-100 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nurse</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</p>
          <p className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</p>
        </div>

        {filtered.map((nurse) => {
          const isInactive = (nurse.status || "active") === "inactive";
          return (
            <div
              key={nurse.id}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem] items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-xs font-black uppercase text-slate-800">{nurse.name}</p>
                  {isInactive && <span className="mrs-status-badge mrs-status-neutral">Inactive</span>}
                  {nurse.linkedUserId && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
                      <Link2 size={11} /> Account
                    </span>
                  )}
                </div>
                {nurse.licenseNumber && (
                  <p className="mt-0.5 break-words text-[10px] font-bold uppercase text-slate-400">
                    {nurse.licenseNumber}
                  </p>
                )}
                {nurse.linkedUserId && nurse.linkedUserEmail && (
                  <p className="mt-0.5 break-words text-[10px] font-bold lowercase text-blue-600">
                    {nurse.linkedUserEmail}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words text-xs font-black uppercase text-slate-700">
                  {nurse.department || "No department"}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                {isAdmin && nurse.department && !nurse.linkedUserId && (
                  <button
                    type="button"
                    onClick={() => openCreateLogin(nurse)}
                    className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100"
                    aria-label={`Create login account for ${nurse.name}`}
                    title="Create login account"
                  >
                    <UserPlus size={17} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(nurse)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  aria-label={`Edit ${nurse.name}`}
                >
                  <Edit size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingToggle(nurse)}
                  disabled={isSaving}
                  className={`rounded-lg border p-2 transition-colors disabled:opacity-60 ${
                    isInactive
                      ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                  title={isInactive ? "Activate nurse" : "Set inactive"}
                  aria-label={`${isInactive ? "Activate" : "Deactivate"} ${nurse.name}`}
                >
                  {isInactive ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <HeartPulse size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-black uppercase text-slate-700">
              {nurses.length === 0 ? "No nurses registered yet" : "No nurses match your search"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {nurses.length === 0
                ? "Add nurses here, then create and link their hospital login accounts."
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
                <p className="text-lg font-black uppercase text-slate-800">{editingId ? "Edit Nurse" : "Add Nurse"}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  A department is required before a login can be created.
                </p>
              </div>
              <button type="button" onClick={closeForm} className="mrs-soft-button rounded-xl p-2" aria-label="Close nurse form">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Nurse Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="e.g. JUAN DELA CRUZ, RN"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment Type</span>
                  <select
                    value={form.departmentType}
                    onChange={(event) => updateForm("departmentType", event.target.value)}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-black uppercase"
                  >
                    {departmentTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Department</span>
                  <select
                    value={form.department}
                    onChange={(event) => updateForm("department", event.target.value)}
                    className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  >
                    <option value="">Select department</option>
                    {currentDepartmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">License No. (optional)</span>
                <input
                  value={form.licenseNumber}
                  onChange={(event) => updateForm("licenseNumber", event.target.value)}
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                />
              </label>
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
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Nurse"}
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
                {willActivate ? "Activate Nurse?" : "Set Nurse Inactive?"}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {willActivate
                  ? `${pendingToggle.name || "This nurse"} will be marked active again.`
                  : `${pendingToggle.name || "This nurse"} will be set inactive. Existing records keep their saved nurse name.`}
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
                  Creates a hospital login with a temporary password to hand to the nurse.
                </p>
              </div>
              <button type="button" onClick={closeCreateLogin} className="mrs-soft-button rounded-xl p-2" aria-label="Close create login">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="mrs-card rounded-xl p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nurse</p>
                <p className="mt-0.5 break-words text-sm font-black uppercase text-slate-800">{linkTarget.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">
                  {linkTarget.department}
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => { setAccountForm((current) => ({ ...current, email: event.target.value })); setError(""); }}
                  placeholder="nurse@email.com"
                  className="mrs-field w-full rounded-xl px-3 py-2.5 text-sm font-bold"
                  autoFocus
                />
              </label>
              <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-blue-700">
                A temporary password is generated and shown after creation. The nurse signs in with it once and must set their own password before reaching the dashboard.
              </p>
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
                {isLinking ? "Creating..." : "Create & Send Link"}
              </button>
            </div>
          </form>
        </div>
      )}

      {createdAccount && (
        <CredentialResultModal
          name={createdAccount.name}
          email={createdAccount.email}
          temporaryPassword={createdAccount.temporaryPassword}
          onClose={() => setCreatedAccount(null)}
        />
      )}

      <FloatingToast
        toast={
          error && !isFormOpen && !linkTarget
            ? { type: "error", message: error }
            : message
              ? { type: "success", title: "Nurse Directory", message, action: "Nurse Directory Updated", audit: true, adminOnly: true, targetPath: "/settings" }
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
