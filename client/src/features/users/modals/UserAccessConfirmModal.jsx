import { ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";

export default function UserAccessConfirmModal({
  action,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  successColor = "green",
}) {
  if (!action) return null;

  const isBlockAction = action.type === "block";
  const isDeleteAction = action.type === "delete";
  const isRoleAction = action.type === "role";
  const successButtonClass = successColor === "green"
    ? "bg-green-600 shadow-green-500/20"
    : "bg-green-700 shadow-green-700/20";
  const targetName = action.user.fullName || action.user.email || "this user";
  const targetRole = action.targetRoleLabel || action.role || "the selected role";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="mrs-panel relative w-full max-w-md rounded-2xl p-6">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
          isDeleteAction
            ? "bg-red-50 text-red-600"
            : isBlockAction
            ? "bg-red-50 text-red-600"
            : isRoleAction
            ? "bg-blue-50 text-blue-700"
            : "bg-green-50 text-green-700"
        }`}>
          {isDeleteAction ? <Trash2 size={26} /> : isBlockAction ? <UserX size={26} /> : isRoleAction ? <ShieldCheck size={26} /> : <UserCheck size={26} />}
        </div>
        <h2 className="text-xl font-black uppercase text-slate-800">
          {isDeleteAction ? "Delete User Account?" : isBlockAction ? "Block User Account?" : isRoleAction ? "Change User Role?" : "Activate User Account?"}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
          {isDeleteAction
            ? `This will remove ${targetName} from the user list and stop future access with this profile.`
            : isBlockAction
              ? `This will stop ${targetName} from accessing the system.`
              : isRoleAction
                ? `This will change ${targetName}'s access role to ${targetRole}.`
                : `This will restore access for ${targetName}.`}
        </p>
        {isBlockAction && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Restriction Reason</p>
            <p className="mt-1 text-sm font-bold text-red-700">{action.reason}</p>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-lg ${
              isBlockAction || isDeleteAction ? "bg-red-600 shadow-red-500/20" : successButtonClass
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
