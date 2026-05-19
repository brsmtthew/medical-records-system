export const notificationStorageKey = "mrs-navbar-notifications";
export const bellNotificationStorageKey = "mrs-bell-notifications";
export const unreadNotificationStorageKey = "mrs-navbar-unread-notifications";
export const maxNotificationLogItems = 50;

// Normalizes toast and bell notification objects before saving or rendering them.
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
    adminOnly: Boolean(notification.adminOnly),
  };
}

// Reads the Settings action-log notification history from local storage.
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

// Saves the Settings action-log notification history with a fixed maximum length.
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

// Removes the local Settings action-log history.
export function clearStoredNotifications() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(notificationStorageKey);
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

// Reads the navbar bell notification list from local storage.
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

// Saves the navbar bell notification list with a fixed maximum length.
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

// Removes the local navbar bell notification history.
export function clearStoredBellNotifications() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(bellNotificationStorageKey);
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

// Reads the persisted unread notification badge count.
export function readStoredUnreadNotifications() {
  try {
    if (typeof localStorage === "undefined") return 0;
    return Number(localStorage.getItem(unreadNotificationStorageKey)) || 0;
  } catch {
    return 0;
  }
}

// Saves a non-negative unread notification badge count.
export function writeStoredUnreadNotifications(count) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(unreadNotificationStorageKey, String(Math.max(0, Number(count) || 0)));
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}
