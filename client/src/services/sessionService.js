const accessTokenKey = "mrs-access-token";
const userKey = "mrs-auth-user";
const persistentSignInKey = "mrs-keep-signed-in";
let expiryTimer = null;
let memorySession = {
  accessToken: "",
  user: null,
};

function readSessionValue(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Some privacy-mode or embedded browser profiles disable sessionStorage.
  }
}

function removeSessionValue(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Keep the in-memory session usable when browser storage is unavailable.
  }
}

function parseJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return readSessionValue(accessTokenKey) || memorySession.accessToken || null;
}

export function getSessionUser() {
  const value = readSessionValue(userKey);
  if (!value) return memorySession.user;
  try {
    return JSON.parse(value);
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  memorySession = { accessToken: "", user: null };
  removeSessionValue(accessTokenKey);
  removeSessionValue(userKey);
  if (expiryTimer) globalThis.clearTimeout(expiryTimer);
  expiryTimer = null;
}

export function savePersistentSignIn(remember) {
  try {
    if (remember) {
      localStorage.setItem(persistentSignInKey, "true");
    } else {
      localStorage.removeItem(persistentSignInKey);
    }
  } catch {
    // Restricted browser profiles can block localStorage.
  }
}

export function readPersistentSignIn() {
  try {
    return localStorage.getItem(persistentSignInKey) === "true";
  } catch {
    return false;
  }
}

export function clearPersistentSignIn() {
  try {
    localStorage.removeItem(persistentSignInKey);
  } catch {
    // Restricted browser profiles can block localStorage.
  }
}

export function cancelAutoLogout() {
  if (expiryTimer) globalThis.clearTimeout(expiryTimer);
  expiryTimer = null;
}

export function scheduleAutoLogout(onExpired = () => {}) {
  if (expiryTimer) globalThis.clearTimeout(expiryTimer);

  const token = getAccessToken();
  const payload = token ? parseJwtPayload(token) : null;
  if (!payload?.exp) return;

  const expiresInMs = payload.exp * 1000 - Date.now();
  if (expiresInMs <= 0) {
    clearSession();
    onExpired();
    return;
  }

  expiryTimer = globalThis.setTimeout(() => {
    clearSession();
    onExpired();
  }, expiresInMs);
}

export function saveSession({ accessToken, user }, onExpired) {
  memorySession = {
    accessToken: accessToken || "",
    user: user || {},
  };
  writeSessionValue(accessTokenKey, accessToken || "");
  writeSessionValue(userKey, JSON.stringify(user || {}));
  scheduleAutoLogout(onExpired);
}
