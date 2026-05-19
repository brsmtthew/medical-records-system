import { UserPlus, X } from "lucide-react";

import {
  defaultDoctorClinics,
  defaultNurseDepartments,
  managedUserRoles,
  roleLabel,
  userRoles,
} from "@shared/constants/userRoles";

export default function UserCreateModal({
  form,
  isCreating,
  isOpen,
  modalKey,
  onClose,
  onSubmit,
  updateForm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        key={modalKey}
        onSubmit={onSubmit}
        autoComplete="off"
        className="mrs-panel relative w-full max-w-2xl rounded-2xl p-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close create user"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3 pr-10">
          <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <UserPlus size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase text-slate-900">Create V3 Account</h2>
            <p className="text-xs font-semibold text-slate-500">
              Admin-created access for Medical Records staff, nurses, and doctors.
            </p>
          </div>
        </div>

        <div className="hidden" aria-hidden="true">
          <input type="text" name="username" autoComplete="username" tabIndex={-1} />
          <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</span>
            <input
              autoComplete="off"
              value={form.fullName}
              onChange={(event) => updateForm("fullName", event.target.value)}
              placeholder="Full name"
              name={`managed-user-name-${modalKey}`}
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</span>
            <input
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="name@hospital.com"
              name={`managed-user-email-${modalKey}`}
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Temporary Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
              placeholder="Temporary password"
              name={`managed-user-temp-password-${modalKey}`}
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</span>
            <select
              value={form.role}
              onChange={(event) => updateForm("role", event.target.value)}
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-black uppercase"
            >
              {managedUserRoles.map((role) => (
                <option key={role} value={role}>{roleLabel(role)}</option>
              ))}
            </select>
          </label>

          {form.role === userRoles.doctor ? (
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Clinic</span>
              <input
                list="doctor-clinics"
                value={form.clinic}
                onChange={(event) => updateForm("clinic", event.target.value)}
                placeholder="Clinic"
                className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
                required
              />
            </label>
          ) : (
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {form.role === userRoles.nurse ? "Department" : "Unit"}
              </span>
              <input
                list="nurse-departments"
                value={form.department}
                onChange={(event) => updateForm("department", event.target.value)}
                placeholder={form.role === userRoles.nurse ? "Department" : "Unit"}
                className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
                required
              />
            </label>
          )}

          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Specialty</span>
            <input
              value={form.specialty}
              onChange={(event) => updateForm("specialty", event.target.value)}
              placeholder="Specialty"
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold"
              disabled={form.role !== userRoles.doctor}
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">License / Employee ID</span>
            <input
              value={form.licenseNumber}
              onChange={(event) => updateForm("licenseNumber", event.target.value)}
              placeholder="License number or employee ID"
              className="mrs-field w-full rounded-xl px-3 py-3 text-sm font-bold uppercase"
            />
          </label>
        </div>

        <datalist id="nurse-departments">
          {defaultNurseDepartments.map((department) => (
            <option key={department} value={department} />
          ))}
        </datalist>
        <datalist id="doctor-clinics">
          {defaultDoctorClinics.map((clinic) => (
            <option key={clinic} value={clinic} />
          ))}
        </datalist>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="mrs-soft-button rounded-xl px-4 py-3 text-xs font-black uppercase"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="mrs-primary-button rounded-xl px-4 py-3 text-xs font-black uppercase disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
