import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import UserAccessConfirmModal from "../modals/users/UserAccessConfirmModal";
import { deleteUserProfile, subscribeToUsers, updateUserAccess } from "../services/userService";
import { useAuth } from "../context/useAuth";

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function Users() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [pendingAccessAction, setPendingAccessAction] = useState(null);
  const [userFilter, setUserFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("name");

  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers(
      setUsers,
      (error) => setAccessError(error.message || "Unable to load users from Firebase."),
    );

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const handleRoleChange = async (user, role) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid && role !== "admin") {
      setAccessError("You cannot remove admin access from your own signed-in account.");
      return;
    }

    try {
      await updateUserAccess(userId, { role });
      setAccessError("");
      setAccessMessage(`${user.fullName || user.email || "User"} role updated to ${role}.`);
    } catch (error) {
      setAccessError(error.message || "Unable to update user role.");
    }
  };

  const handleBlockUser = (user) => {
    const userId = user.uid || user.id;
    if (userId === currentUser?.uid) {
      setAccessError("You cannot block your own signed-in account.");
      return;
    }

    const reason = (restrictionReasons[userId] || "").trim();
    if (!reason) {
      setAccessError("Enter a reason before blocking this account.");
      return;
    }

    setAccessError("");
    setPendingAccessAction({ type: "block", user, reason });
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

    const { type, user, reason = "" } = pendingAccessAction;
    const userId = user.uid || user.id;
    const userName = user.fullName || user.email || "User";

    try {
      if (type === "delete") {
        await deleteUserProfile(userId);
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
      setAccessMessage(`${userName} was ${type === "delete" ? "deleted" : type === "block" ? "blocked" : "activated"}.`);
      setPendingAccessAction(null);
    } catch (error) {
      setAccessError(error.message || `Unable to ${type} user.`);
      setPendingAccessAction(null);
    }
  };

  const activeUsers = users.filter((user) => user.accountStatus !== "disabled").length;
  const blockedUsers = users.length - activeUsers;
  const adminUsers = users.filter((user) => user.role === "admin").length;
  const staffUsers = users.filter((user) => user.role !== "admin").length;
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (userFilter === "active") return user.accountStatus !== "disabled";
      if (userFilter === "blocked") return user.accountStatus === "disabled";
      if (userFilter === "admins") return user.role === "admin";
      if (userFilter === "staff") return user.role !== "admin";
      return true;
    }).filter((user) => {
      if (!query) return true;
      return `${user.fullName || ""} ${user.displayName || ""} ${user.email || ""} ${user.department || ""}`
        .toLowerCase()
        .includes(query);
    }).sort((first, second) => {
      if (sortMode === "role") return String(first.role || "staff").localeCompare(String(second.role || "staff"));
      if (sortMode === "status") return String(first.accountStatus || "active").localeCompare(String(second.accountStatus || "active"));
      if (sortMode === "email") return String(first.email || "").localeCompare(String(second.email || ""));
      return String(first.fullName || first.displayName || first.email || "").localeCompare(String(second.fullName || second.displayName || second.email || ""));
    });
  }, [searchTerm, sortMode, userFilter, users]);
  const userNavItems = [
    { id: "all", label: "All Users", value: users.length, icon: UsersIcon, tone: "text-green-700", iconClass: "border-green-200 bg-green-50 text-green-700" },
    { id: "active", label: "Active", value: activeUsers, icon: UserCheck, tone: "text-blue-700", iconClass: "border-blue-200 bg-blue-50 text-blue-700" },
    { id: "blocked", label: "Blocked", value: blockedUsers, icon: UserX, tone: "text-red-700", iconClass: "border-red-200 bg-red-50 text-red-700" },
    { id: "admins", label: "Admins", value: adminUsers, icon: ShieldCheck, tone: "text-amber-700", iconClass: "border-amber-200 bg-amber-50 text-amber-700" },
    { id: "staff", label: "Staff", value: staffUsers, icon: UserCog, tone: "text-cyan-700", iconClass: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              User <span className="text-green-700">Management</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Manage admin and staff access from a dedicated admin workspace.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-5">
            {userNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setUserFilter(item.id)}
                className={`mrs-mini-stat mrs-card rounded-xl p-2.5 pl-3 text-left transition-colors ${item.tone} ${
                  userFilter === item.id ? "border-green-400 bg-green-50 shadow-sm" : "hover:border-green-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-black leading-none text-slate-800">{item.value}</p>
                  </div>
                  <div className={`shrink-0 rounded-xl border p-1.5 ${item.iconClass}`}>
                    <item.icon size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mrs-panel mrs-filter-strip shrink-0 rounded-xl p-2">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users, email, or department"
                className="mrs-field w-full rounded-lg py-2 pl-9 pr-3 text-xs font-bold"
              />
            </div>
            <select
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              className="mrs-field rounded-lg px-3 py-2 text-xs font-black uppercase"
              aria-label="Filter users"
            >
              {userNavItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({item.value})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-slate-400" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="mrs-field rounded-lg px-3 py-2 text-xs font-black uppercase"
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

        <div className="mrs-panel min-h-0 flex-1 overflow-hidden rounded-xl">
          <div className="min-h-0 h-full overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1040px] table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="mrs-section-band border-b border-slate-100">
                  <th className="w-[25%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    User
                  </th>
                  <th className="w-[14%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Role
                  </th>
                  <th className="w-[13%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </th>
                  <th className="w-[24%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Block Reason
                  </th>
                  <th className="w-[24%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const userId = user.uid || user.id;
                  const isSelf = userId === currentUser?.uid;
                  const isDisabled = user.accountStatus === "disabled";

                  return (
                    <tr key={userId} className="mrs-table-row">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50 text-xs font-black text-green-700">
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
                          value={user.role === "admin" ? "admin" : "staff"}
                          onChange={(event) => handleRoleChange(user, event.target.value)}
                          disabled={isSelf}
                          className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-black uppercase disabled:opacity-60"
                          aria-label={`Role for ${user.email || user.fullName || "user"}`}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span className={`mrs-status-badge ${isDisabled ? "mrs-status-danger" : "mrs-status-success"}`}>
                          {isDisabled ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="p-3">
                        <input
                          value={restrictionReasons[userId] ?? user.restrictionReason ?? ""}
                          onChange={(event) => setRestrictionReasons((current) => ({
                            ...current,
                            [userId]: event.target.value,
                          }))}
                          placeholder="Required before blocking"
                          className="mrs-field w-full rounded-lg px-3 py-2 text-xs font-bold"
                          disabled={isSelf}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {isDisabled ? (
                            <button
                              type="button"
                              onClick={() => handleActivateUser(user)}
                              disabled={isSelf}
                              className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-black uppercase text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                            >
                              <UserCheck size={16} />
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBlockUser(user)}
                              disabled={isSelf}
                              className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <UserX size={16} />
                              Block
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black uppercase text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            aria-label={`Delete ${user.email || user.fullName || "user"}`}
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <ShieldCheck size={38} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">
                        {users.length === 0 ? "No user profiles yet" : "No users match this view"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        {users.length === 0
                          ? "Profiles appear after users sign in or create a staff account."
                          : "Choose another user navigation filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UserAccessConfirmModal
        action={pendingAccessAction}
        onCancel={() => setPendingAccessAction(null)}
        onConfirm={confirmAccessAction}
        successColor="darkGreen"
      />

      <FloatingToast
        toast={
          accessError
            ? { type: "error", message: accessError }
            : accessMessage
              ? { type: "success", title: "User Access", message: accessMessage, action: "User Access Updated", audit: true, adminOnly: true }
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
