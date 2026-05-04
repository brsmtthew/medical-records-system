import React, { useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useAuth } from "../context/useAuth";
import {
  normalizeNotification,
  readStoredNotifications,
  writeStoredNotifications,
} from "../utils/notificationLog";

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
  const { currentUser } = useAuth();
  const lastPublishedToastRef = useRef("");

  useEffect(() => {
    if (!toast || duration === 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      onClose?.();
    }, duration);

    return () => window.clearTimeout(timeoutId);
  }, [duration, onClose, toast]);

  useEffect(() => {
    if (!toast?.message) return;

    const toastKey = `${toast.type || "info"}|${toast.title || ""}|${toast.message}`;
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
      userName: currentUser?.displayName || currentUser?.email || "Unknown User",
      userEmail: currentUser?.email || "",
      userId: currentUser?.uid || "",
    });

    writeStoredNotifications([notification, ...readStoredNotifications()]);
    window.dispatchEvent(new CustomEvent("mrs-toast", { detail: notification }));
  }, [currentUser, toast]);

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
          className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[120] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 sm:left-auto sm:right-5 sm:top-5 sm:w-[min(360px,calc(100vw-2rem))] sm:p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className={`shrink-0 rounded-xl border p-2 ${config.iconClass}`}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-[13px] font-black uppercase leading-snug text-slate-900 sm:text-sm">
                {toast.title || config.title}
              </p>
              <p className="mt-0.5 break-words text-xs font-bold leading-relaxed text-slate-500">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-black"
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
