import React, { useEffect, useState } from "react";
import {
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

export default function Users() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [restrictionReasons, setRestrictionReasons] = useState({});
  const [accessError, setAccessError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [pendingAccessAction, setPendingAccessAction] = useState(null);

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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto xl:grid-cols-2">
          {users.map((user) => {
            const userId = user.uid || user.id;
            const isSelf = userId === currentUser?.uid;
            const isDisabled = user.accountStatus === "disabled";

            return (
              <div key={userId} className="mrs-card rounded-xl p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black uppercase text-slate-800">
                      {user.fullName || user.displayName || "Unnamed User"}
                    </p>
                    <p className="mt-1 break-words text-[10px] font-bold text-slate-400">
                      {user.email || "No email saved"}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                    isDisabled
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                  }`}>
                    {isDisabled ? "Blocked" : "Active"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Role</span>
                    <select
                      value={user.role === "admin" ? "admin" : "staff"}
                      onChange={(event) => handleRoleChange(user, event.target.value)}
                      disabled={isSelf}
                      className="mrs-field w-full rounded-xl px-3 py-2 text-xs font-black uppercase disabled:opacity-60"
                      aria-label={`Role for ${user.email || user.fullName || "user"}`}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">Restriction Reason</span>
                    <input
                      value={restrictionReasons[userId] ?? user.restrictionReason ?? ""}
                      onChange={(event) => setRestrictionReasons((current) => ({
                        ...current,
                        [userId]: event.target.value,
                      }))}
                      placeholder="Required before blocking"
                      className="mrs-field w-full rounded-xl px-3 py-2 text-xs font-bold"
                      disabled={isSelf}
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  {isDisabled ? (
                    <button
                      type="button"
                      onClick={() => handleActivateUser(user)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-black uppercase text-green-700"
                    >
                      <UserCheck size={16} />
                      Activate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBlockUser(user)}
                      disabled={isSelf}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black uppercase text-red-600 disabled:opacity-50"
                    >
                      <UserX size={16} />
                      Block
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="mrs-card rounded-2xl p-10 text-center xl:col-span-2">
              <ShieldCheck size={38} className="mx-auto mb-3 text-slate-300" />
              <p className="font-black uppercase text-slate-700">No user profiles yet</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Profiles appear after users sign in or create a staff account.
              </p>
            </div>
          )}
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
