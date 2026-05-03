export const notificationStorageKey = "mrs-navbar-notifications";
export const bellNotificationStorageKey = "mrs-bell-notifications";
export const unreadNotificationStorageKey = "mrs-navbar-unread-notifications";
export const maxNotificationLogItems = 50;

export function normalizeNotification(notification) {
  return {
    id: notification.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: notification.type || "info",
    title: notification.title || "",
    message: notification.message || "",
    createdAt: notification.createdAt || new Date().toISOString(),
    patientName: notification.patientName || "",
    caseNumber: notification.caseNumber || "",
    action: notification.action || notification.title || "",
    userName: notification.userName || "",
    userEmail: notification.userEmail || "",
    userId: notification.userId || "",
  };
}

export function readStoredNotifications() {
  try {
    if (typeof localStorage === "undefined") return [];
    const storedNotifications = localStorage.getItem(notificationStorageKey);
    const parsed = storedNotifications ? JSON.parse(storedNotifications) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNotification) : [];
  } catch {
    return [];
  }
}

export function writeStoredNotifications(notifications) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      notificationStorageKey,
      JSON.stringify(notifications.map(normalizeNotification).slice(0, maxNotificationLogItems)),
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

export function readStoredBellNotifications() {
  try {
    if (typeof localStorage === "undefined") return [];
    const storedNotifications = localStorage.getItem(bellNotificationStorageKey);
    const parsed = storedNotifications ? JSON.parse(storedNotifications) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNotification) : [];
  } catch {
    return [];
  }
}

export function writeStoredBellNotifications(notifications) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      bellNotificationStorageKey,
      JSON.stringify(notifications.map(normalizeNotification).slice(0, maxNotificationLogItems)),
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

export function readStoredUnreadNotifications() {
  try {
    if (typeof localStorage === "undefined") return 0;
    return Number(localStorage.getItem(unreadNotificationStorageKey)) || 0;
  } catch {
    return 0;
  }
}

export function writeStoredUnreadNotifications(count) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(unreadNotificationStorageKey, String(Math.max(0, Number(count) || 0)));
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}
