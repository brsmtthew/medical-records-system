import React, { useCallback, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useAuth } from "@features/auth/context/useAuth";
import {
  normalizeNotification,
  readStoredNotifications,
  writeStoredNotifications,
} from "@shared/utils/notificationLog";
import { addAuditLog } from "../../features/charts/services/chartService";

const toastConfig = {
  success: {
    title: "Success",
    icon: CheckCircle2,
    iconClass: "bg-green-600 text-white",
  },
  error: {
    title: "Action Needed",
    icon: AlertTriangle,
    iconClass: "bg-red-600 text-white",
  },
  info: {
    title: "Notice",
    icon: Info,
    iconClass: "bg-slate-900 text-white",
  },
};

export default function FloatingToast({ toast, onClose, duration = 3200 }) {
  const { currentUser, userProfile } = useAuth();
  const lastPublishedToastRef = useRef("");
  const timeoutRef = useRef(null);

  const clearDismissTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startDismissTimer = useCallback(() => {
    clearDismissTimer();
    if (!toast || duration === 0) return;
    timeoutRef.current = window.setTimeout(() => {
      onClose?.();
    }, duration);
  }, [clearDismissTimer, duration, onClose, toast]);

  useEffect(() => {
    // Auto-dismisses temporary toasts while allowing persistent setup warnings.
    startDismissTimer();
    return clearDismissTimer;
  }, [clearDismissTimer, startDismissTimer]);

  useEffect(() => {
    // Publishes only audited toasts into notification history and centralized staff logs.
    if (!toast?.message || !toast.audit) return;

    const toastKey = `${toast.type || "info"}|${toast.title || ""}|${toast.message}|${toast.patientName || ""}|${toast.caseNumber || ""}`;
    if (lastPublishedToastRef.current === toastKey) return;

    lastPublishedToastRef.current = toastKey;
    const notification = normalizeNotification({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: toast.type || "info",
      title: toast.title,
      message: toast.message,
      createdAt: new Date().toISOString(),
      patientName: toast.patientName || "",
      caseNumber: toast.caseNumber || "",
      action: toast.action || toast.title || "",
      userName: userProfile?.fullName || currentUser?.displayName || currentUser?.email || "Unknown User",
      userEmail: currentUser?.email || "",
      userId: currentUser?.uid || "",
      adminOnly: Boolean(toast.adminOnly),
    });

    try {
      writeStoredNotifications([notification, ...readStoredNotifications()]);
      window.dispatchEvent(new CustomEvent("mrs-toast", { detail: notification }));
    } catch (error) {
      console.error("Unable to publish local notification:", error);
    }

    addAuditLog(notification).catch((error) => {
      console.error("Unable to write audit notification:", error);
    });
  }, [currentUser, toast, userProfile]);

  const type = toast?.type || "info";
  const config = toastConfig[type] || toastConfig.info;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {toast && (
        <Motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          onMouseEnter={clearDismissTimer}
          onMouseLeave={startDismissTimer}
          className="fixed inset-x-3 top-[max(0.6rem,env(safe-area-inset-top))] z-[220] rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(320px,calc(100vw-2rem))]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5">
            <div className={`shrink-0 rounded-lg border p-1.5 ${config.iconClass}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-xs font-black uppercase leading-snug text-slate-900">
                {toast.title || config.title}
              </p>
              <p className="mt-0.5 break-words text-[11px] font-bold leading-snug text-slate-500">{toast.message}</p>
              {(toast.patientName || toast.caseNumber) && (
                <p className="mt-1 break-words text-[10px] font-black uppercase leading-snug text-slate-400">
                  {[toast.patientName, toast.caseNumber].filter(Boolean).join(" - ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-black"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
