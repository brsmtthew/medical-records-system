import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import { subscribeToUsers, updateUserAccess } from "../services/userService";
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

  const confirmAccessAction = async () => {
    if (!pendingAccessAction) return;

    const { type, user, reason = "" } = pendingAccessAction;
    const userId = user.uid || user.id;
    const userName = user.fullName || user.email || "User";

    try {
      if (type === "block") {
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
      setAccessMessage(`${userName} was ${type === "block" ? "blocked" : "activated"}.`);
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
    { id: "all", label: "All Users", value: users.length, icon: UsersIcon },
    { id: "active", label: "Active", value: activeUsers, icon: UserCheck },
    { id: "blocked", label: "Blocked", value: blockedUsers, icon: UserX },
    { id: "admins", label: "Admins", value: adminUsers, icon: ShieldCheck },
    { id: "staff", label: "Staff", value: staffUsers, icon: UserCog },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              User <span className="text-green-700">Management</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Manage admin and staff access from a dedicated admin workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            {[
              { label: "Total", value: users.length, icon: UsersIcon },
              { label: "Admins", value: adminUsers, icon: UserCog },
              { label: "Blocked", value: blockedUsers, icon: UserX },
            ].map((item) => (
              <div key={item.label} className="mrs-card rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-green-100 bg-green-50 p-2 text-green-700">
                    <item.icon size={17} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">{item.label}</p>
                    <p className="text-lg font-black text-slate-800">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid shrink-0 gap-2 xl:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-green-50 p-3 xl:col-span-2">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-green-700">
                <ShieldCheck size={21} />
              </div>
              <div>
                <p className="text-sm font-black uppercase text-slate-800">Secure Admin Creation</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                  Public account creation stays limited to staff. Admin access should be granted only by an existing admin.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-black uppercase text-blue-800">Staff Restrictions</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-blue-700">
              Staff cannot manage users, clear admin logs, or edit protected system controls.
            </p>
          </div>
        </div>

        <div className="mrs-nav-list shrink-0 overflow-x-auto pb-1">
          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = userFilter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setUserFilter(item.id)}
                className={`mrs-nav-pill shrink-0 gap-2 px-3 py-2 text-sm ${
                  isActive ? "mrs-nav-pill-active" : ""
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600">
                  {item.value}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mrs-panel shrink-0 rounded-xl p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users, email, or department"
                className="mrs-field w-full rounded-lg py-2.5 pl-9 pr-3 text-sm font-bold"
              />
            </div>
            <label className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-slate-400" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="mrs-field rounded-lg px-3 py-2.5 text-xs font-black uppercase"
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
            <table className="w-full min-w-[960px] table-fixed text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-white">
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    User
                  </th>
                  <th className="w-[14%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Role
                  </th>
                  <th className="w-[13%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </th>
                  <th className="w-[28%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Restriction Reason
                  </th>
                  <th className="w-[18%] p-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                          isDisabled
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-green-200 bg-green-50 text-green-700"
                        }`}>
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
                        <div className="flex justify-end">
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

      {pendingAccessAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPendingAccessAction(null)}
          />
          <div className="mrs-panel relative w-full max-w-md rounded-2xl p-6">
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
              pendingAccessAction.type === "block"
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-700"
            }`}>
              {pendingAccessAction.type === "block" ? <UserX size={26} /> : <UserCheck size={26} />}
            </div>
            <h2 className="text-xl font-black uppercase text-slate-800">
              {pendingAccessAction.type === "block" ? "Block Staff Account?" : "Activate Staff Account?"}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {pendingAccessAction.type === "block"
                ? `This will stop ${pendingAccessAction.user.fullName || pendingAccessAction.user.email || "this user"} from accessing the system.`
                : `This will restore access for ${pendingAccessAction.user.fullName || pendingAccessAction.user.email || "this user"}.`}
            </p>
            {pendingAccessAction.type === "block" && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Restriction Reason</p>
                <p className="mt-1 text-sm font-bold text-red-700">{pendingAccessAction.reason}</p>
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingAccessAction(null)}
                className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAccessAction}
                className={`rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg ${
                  pendingAccessAction.type === "block"
                    ? "bg-red-600 shadow-red-600/20"
                    : "bg-green-700 shadow-green-700/20"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
