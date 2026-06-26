import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  HeartPulse,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import UserAccessConfirmModal from "../modals/UserAccessConfirmModal";
import UserCreateModal from "../modals/UserCreateModal";
import { createManagedUserAccount, deleteUserProfile, subscribeToUsers, updateUserAccess } from "@features/users/services/userService";
import { useAuth } from "@features/auth/context/useAuth";
import { useDebouncedValue } from "@shared/hooks/useDebouncedValue";
import { normalizeUserRole, roleLabel, userRoles } from "@shared/constants/userRoles";
import { defaultDoctorClinics, defaultNurseDepartments } from "@shared/constants/defaultOptions";
import { isStrongPassword, normalizeEmail, sanitizeText } from "@shared/utils/security";

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

const initialCreateForm = {
  fullName: "",
  email: "",
  password: "",
  role: userRoles.staff,
  department: "Medical Records",
  clinic: "",
  specialty: "",
  licenseNumber: "",
};

// Sub-text shown in the content panel header for the selected left-menu item.
const filterDescriptions = {
  all: "Every account across Medical Records and clinical workspaces.",
  active: "Accounts that can currently sign in and work.",
  blocked: "Disabled accounts that cannot sign in.",
  admins: "System administrators with full access.",
  staff: "Medical Records workspace accounts.",
  nurses: "Nurse accounts for clinical workspace access.",
  doctors: "Doctor accounts for chart requests and clinical access.",
};

export default function Users() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [blockReason, setBlockReason] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [pendingAccessAction, setPendingAccessAction] = useState(null);
  const [userFilter, setUserFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("name");
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalKey, setCreateModalKey] = useState(0);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers(
      setUsers,
      (error) => setAccessError(error.message || "Unable to load users from Firebase."),
    );

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const handleRoleChange = (user, role) => {
    const userId = user.uid || user.id;
    const normalizedRole = normalizeUserRole(role);
    const currentRole = normalizeUserRole(user.role);
    if (normalizedRole === currentRole) return;
    if (userId === currentUser?.uid && normalizedRole !== userRoles.admin) {
      setAccessError("You cannot remove admin access from your own signed-in account.");
      return;
    }

    setAccessError("");
    setPendingAccessAction({
      type: "role",
      user,
      role: normalizedRole,
      targetRoleLabel: roleLabel(normalizedRole),
    });
  };

  const updateCreateForm = (key, value) => {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "role") {
        if (value === userRoles.nurse) {
          next.department = next.department || defaultNurseDepartments[0];
          next.clinic = "";
          next.specialty = "";
        } else if (value === userRoles.doctor) {
          next.department = "";
          next.clinic = next.clinic || defaultDoctorClinics[0];
        } else {
          next.department = next.department || "Medical Records";
          next.clinic = "";
          next.specialty = "";
        }
      }
      return next;
    });
    setAccessError("");
    setAccessMessage("");
  };

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setAccessError("");
    setAccessMessage("");
    setCreateModalKey((key) => key + 1);
    setIsCreateModalOpen(true);
    window.setTimeout(() => setCreateForm(initialCreateForm), 80);
  };

  const closeCreateModal = () => {
    if (isCreatingUser) return;
    setCreateForm(initialCreateForm);
    setCreateModalKey((key) => key + 1);
    setIsCreateModalOpen(false);
  };

  const handleCreateManagedUser = async (event) => {
    event.preventDefault();
    const fullName = sanitizeText(createForm.fullName, { maxLength: 120 });
    const email = normalizeEmail(createForm.email);
    const role = normalizeUserRole(createForm.role);

    if (!fullName || !email || !createForm.password) {
      setAccessError("Enter full name, email, and temporary password.");
      return;
    }
    if (!isStrongPassword(createForm.password)) {
      setAccessError("Temporary password must use at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }
    if (role === userRoles.nurse && !createForm.department.trim()) {
      setAccessError("Assign a department for the nurse account.");
      return;
    }

    try {
      setIsCreatingUser(true);
      await createManagedUserAccount({
        ...createForm,
        fullName,
        email,
        role,
      });

      setCreateForm(initialCreateForm);
      setIsCreateModalOpen(false);
      setAccessError("");
      setAccessMessage(`${roleLabel(role)} account created for ${fullName}.`);
    } catch (error) {
      setAccessError(error.message || "Unable to create this account.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleBlockUser = (user) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid) {
      setAccessError("You cannot block your own signed-in account.");
      return;
    }

    setAccessError("");
    setBlockReason("");
    setPendingAccessAction({ type: "block", user });
  };

  const handleActivateUser = (user) => {
    setAccessError("");
    setPendingAccessAction({ type: "activate", user });
  };

  const handleDeleteUser = (user) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid) {
      setAccessError("You cannot delete your own signed-in account.");
      return;
    }

    setAccessError("");
    setPendingAccessAction({ type: "delete", user });
  };

  const confirmAccessAction = async () => {
    if (!pendingAccessAction) return;

    const { type, user } = pendingAccessAction;
    const userId = user.uid || user.id;
    const userName = user.fullName || user.email || "User";
    const reason = blockReason.trim();

    if (type === "block" && !reason) {
      setAccessError("Enter a reason before blocking this account.");
      return;
    }

    try {
      if (type === "delete") {
        await deleteUserProfile(userId);
      } else if (type === "role") {
        await updateUserAccess(userId, { role: pendingAccessAction.role });
      } else if (type === "block") {
        await updateUserAccess(userId, {
          accountStatus: "disabled",
          restrictionReason: reason,
        });
      } else {
        await updateUserAccess(userId, {
          accountStatus: "active",
          restrictionReason: "",
        });
      }

      setAccessError("");
      setAccessMessage(
        type === "role"
          ? `${userName} role updated to ${roleLabel(pendingAccessAction.role)}.`
          : `${userName} was ${type === "delete" ? "deleted" : type === "block" ? "blocked" : "activated"}.`,
      );
      setPendingAccessAction(null);
      setBlockReason("");
    } catch (error) {
      setAccessError(error.message || `Unable to ${type} user.`);
      setPendingAccessAction(null);
    }
  };

  const activeUsers = users.filter((user) => user.accountStatus !== "disabled").length;
  const blockedUsers = users.length - activeUsers;
  const adminUsers = users.filter((user) => normalizeUserRole(user.role) === userRoles.admin).length;
  const staffUsers = users.filter((user) => normalizeUserRole(user.role) === userRoles.staff).length;
  const nurseUsers = users.filter((user) => normalizeUserRole(user.role) === userRoles.nurse).length;
  const doctorUsers = users.filter((user) => normalizeUserRole(user.role) === userRoles.doctor).length;
  const debouncedSearch = useDebouncedValue(searchTerm);
  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return users.filter((user) => {
      const role = normalizeUserRole(user.role);
      if (userFilter === "active") return user.accountStatus !== "disabled";
      if (userFilter === "blocked") return user.accountStatus === "disabled";
      if (userFilter === "admins") return role === userRoles.admin;
      if (userFilter === "staff") return role === userRoles.staff;
      if (userFilter === "nurses") return role === userRoles.nurse;
      if (userFilter === "doctors") return role === userRoles.doctor;
      return true;
    }).filter((user) => {
      if (!query) return true;
      return `${user.fullName || ""} ${user.displayName || ""} ${user.email || ""} ${user.department || ""} ${user.clinic || ""} ${user.specialty || ""} ${user.licenseNumber || ""}`
        .toLowerCase()
        .includes(query);
    }).sort((first, second) => {
      if (sortMode === "role") return roleLabel(first.role).localeCompare(roleLabel(second.role));
      if (sortMode === "status") return String(first.accountStatus || "active").localeCompare(String(second.accountStatus || "active"));
      if (sortMode === "email") return String(first.email || "").localeCompare(String(second.email || ""));
      return String(first.fullName || first.displayName || first.email || "").localeCompare(String(second.fullName || second.displayName || second.email || ""));
    });
  }, [debouncedSearch, sortMode, userFilter, users]);
  const userNavItems = [
    { id: "all", label: "All Users", value: users.length, icon: UsersIcon, tone: "text-green-700", iconClass: "border-green-200 bg-green-50 text-green-700" },
    { id: "active", label: "Active", value: activeUsers, icon: UserCheck, tone: "text-blue-700", iconClass: "border-blue-200 bg-blue-50 text-blue-700" },
    { id: "blocked", label: "Blocked", value: blockedUsers, icon: UserX, tone: "text-red-700", iconClass: "border-red-200 bg-red-50 text-red-700" },
    { id: "admins", label: "Admins", value: adminUsers, icon: ShieldCheck, tone: "text-amber-700", iconClass: "border-amber-200 bg-amber-50 text-amber-700" },
    { id: "staff", label: "Staff", value: staffUsers, icon: UserCog, tone: "text-cyan-700", iconClass: "border-cyan-200 bg-cyan-50 text-cyan-700" },
    { id: "nurses", label: "Nurses", value: nurseUsers, icon: HeartPulse, tone: "text-emerald-700", iconClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    { id: "doctors", label: "Doctors", value: doctorUsers, icon: Stethoscope, tone: "text-violet-700", iconClass: "border-violet-200 bg-violet-50 text-violet-700" },
  ];
  const activeNavItem = userNavItems.find((item) => item.id === userFilter) || userNavItems[0];
  const ActiveNavIcon = activeNavItem.icon;

  const renderUserRows = (rows, emptyTitle, emptyDescription) => (
    <tbody className="divide-y divide-slate-100">
      {rows.map((user) => {
        const userId = user.uid || user.id;
        const isSelf = userId === currentUser?.uid;
        const isDisabled = user.accountStatus === "disabled";
        const role = normalizeUserRole(user.role);
        const assignment = role === userRoles.doctor
          ? user.clinic || "No clinic assigned"
          : user.department || "No department assigned";

        return (
          <tr key={userId} className="mrs-table-row">
            <td className="p-3">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-black ring-2 ${
                  isDisabled ? "bg-red-50 text-red-700 ring-red-100" : "bg-green-50 text-green-700 ring-green-100"
                }`}>
                  {user.photoDataUrl ? (
                    <img src={user.photoDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(user.fullName || user.displayName || user.email)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-black uppercase text-slate-800">
                    {user.fullName || user.displayName || "Unnamed User"}
                  </p>
                  <p className="mt-1 break-words text-[10px] font-bold text-slate-400">
                    {user.email || "No email saved"}
                  </p>
                  {isSelf && (
                    <p className="mt-1 text-[10px] font-black uppercase text-blue-600">
                      Signed-in account
                    </p>
                  )}
                </div>
              </div>
            </td>
            <td className="p-3">
              <select
                value={role}
                onChange={(event) => handleRoleChange(user, event.target.value)}
                disabled={isSelf}
                className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase disabled:opacity-60"
                aria-label={`Role for ${user.email || user.fullName || "user"}`}
              >
                <option value="staff">Medical Records Staff</option>
                <option value="nurse">Nurse</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td className="p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {role === userRoles.doctor ? "Clinic" : "Department"}
              </p>
              <p className="mt-0.5 break-words text-xs font-black uppercase text-slate-800">{assignment}</p>
              {user.specialty && (
                <p className="mt-1 break-words text-[10px] font-bold uppercase text-violet-700">{user.specialty}</p>
              )}
              {user.licenseNumber && (
                <p className="mt-0.5 break-words font-mono text-[10px] font-bold text-slate-400">{user.licenseNumber}</p>
              )}
            </td>
            <td className="p-3">
              <span className={`mrs-status-badge ${isDisabled ? "mrs-status-danger" : "mrs-status-success"}`}>
                {isDisabled ? "Blocked" : "Active"}
              </span>
              {isDisabled && user.restrictionReason && (
                <p className="mt-1.5 break-words text-[10px] font-bold uppercase leading-tight text-red-600">
                  {user.restrictionReason}
                </p>
              )}
            </td>
            <td className="p-3">
              <div className="flex justify-end gap-2">
                {isDisabled ? (
                  <button
                    type="button"
                    onClick={() => handleActivateUser(user)}
                    disabled={isSelf}
                    className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-xs font-black uppercase text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                  >
                    <UserCheck size={16} />
                    Activate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBlockUser(user)}
                    disabled={isSelf}
                    className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-black uppercase text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    <UserX size={16} />
                    Block
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteUser(user)}
                  disabled={isSelf}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Delete ${user.email || user.fullName || "user"}`}
                  title="Delete user"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        );
      })}

      {rows.length === 0 && (
        <tr>
          <td colSpan="5" className="p-8 text-center">
            <ShieldCheck size={34} className="mx-auto mb-3 text-slate-300" />
            <p className="font-black uppercase text-slate-700">{emptyTitle}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">{emptyDescription}</p>
          </td>
        </tr>
      )}
    </tbody>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="mb-2 shrink-0">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
            User <span className="text-green-700">Management</span>
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Create and manage Medical Records, nurse, and doctor access from a dedicated admin workspace.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-12">
          <div className="lg:col-span-3">
            <div className="mrs-settings-menu mrs-panel flex flex-col rounded-2xl p-2.5">
              <div className="flex flex-wrap gap-2 overflow-x-hidden lg:block lg:space-y-1.5 lg:overflow-visible">
                {userNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = userFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUserFilter(item.id)}
                      aria-pressed={isActive}
                      className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-black transition-colors lg:w-full ${
                        isActive
                          ? "border-green-200 bg-green-700 text-white shadow-sm"
                          : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-white/15 text-white" : "bg-slate-50 text-slate-400"
                      }`}>
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 whitespace-nowrap text-left uppercase">{item.label}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-2 overflow-hidden lg:col-span-9">
            <div className="mrs-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-100 p-2.5 text-green-700 shadow-sm">
                    <ActiveNavIcon size={21} />
                  </div>
                  <div>
                    <h2 className="font-black uppercase text-slate-800">{activeNavItem.label}</h2>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {filterDescriptions[activeNavItem.id]}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
                >
                  <UserPlus size={17} />
                  Create Account
                </button>
              </div>

              <div className="mrs-filter-strip shrink-0 border-b border-slate-100 p-2">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search users, email, or department"
                      className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <ArrowUpDown size={16} className="text-slate-400" />
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                      className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase"
                      aria-label="Sort users"
                    >
                      <option value="name">Sort By Name</option>
                      <option value="email">Sort By Email</option>
                      <option value="role">Sort By Role</option>
                      <option value="status">Sort By Status</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full table-fixed text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="mrs-section-band border-b border-slate-200">
                      <th className="w-[28%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                      <th className="w-[16%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                      <th className="w-[24%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment</th>
                      <th className="w-[16%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="w-[16%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  {renderUserRows(
                    filteredUsers,
                    users.length === 0 ? "No user profiles yet" : "No accounts match this view",
                    users.length === 0
                      ? "Profiles appear after users sign in or create an account."
                      : "Change the menu selection or search term to see more accounts.",
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UserAccessConfirmModal
        action={pendingAccessAction}
        confirmLabel={pendingAccessAction?.type === "role" ? "Change Role" : pendingAccessAction?.type === "block" ? "Block Account" : "Confirm"}
        reason={blockReason}
        onReasonChange={setBlockReason}
        onCancel={() => {
          setPendingAccessAction(null);
          setBlockReason("");
        }}
        onConfirm={confirmAccessAction}
        successColor="darkGreen"
      />

      <UserCreateModal
        form={createForm}
        isCreating={isCreatingUser}
        isOpen={isCreateModalOpen}
        modalKey={createModalKey}
        onClose={closeCreateModal}
        onSubmit={handleCreateManagedUser}
        updateForm={updateCreateForm}
      />

      <FloatingToast
        toast={
          accessError
            ? { type: "error", message: accessError }
            : accessMessage
              ? { type: "success", title: "User Access", message: accessMessage, action: "User Access Updated", audit: true, adminOnly: true, targetPath: "/users" }
              : null
        }
        onClose={() => {
          setAccessError("");
          setAccessMessage("");
        }}
      />
    </DashboardLayout>
  );
}
