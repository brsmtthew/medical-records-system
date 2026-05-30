const accessTokenKey = "mrs-access-token";
const userKey = "mrs-auth-user";
const persistentSignInKey = "mrs-keep-signed-in";
let expiryTimer = null;

function parseJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(accessTokenKey);
}

export function getSessionUser() {
  const value = sessionStorage.getItem(userKey);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(accessTokenKey);
  sessionStorage.removeItem(userKey);
  if (expiryTimer) window.clearTimeout(expiryTimer);
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
  if (expiryTimer) window.clearTimeout(expiryTimer);
  expiryTimer = null;
}

export function scheduleAutoLogout(onExpired = () => {}) {
  if (expiryTimer) window.clearTimeout(expiryTimer);

  const token = getAccessToken();
  const payload = token ? parseJwtPayload(token) : null;
  if (!payload?.exp) return;

  const expiresInMs = payload.exp * 1000 - Date.now();
  if (expiresInMs <= 0) {
    clearSession();
    onExpired();
    return;
  }

  expiryTimer = window.setTimeout(() => {
    clearSession();
    onExpired();
  }, expiresInMs);
}

export function saveSession({ accessToken, user }, onExpired) {
  sessionStorage.setItem(accessTokenKey, accessToken);
  sessionStorage.setItem(userKey, JSON.stringify(user || {}));
  scheduleAutoLogout(onExpired);
}
