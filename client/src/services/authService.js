import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../firebaseClient";
import { apiRequest } from "./apiClient";
import { clearSession, saveSession } from "./sessionService";
import { addAuditLog } from "./recordsService";

const loginAttemptStorageKey = "mrs-login-attempts";
const maxLoginAttempts = 5;
const loginLockoutMs = 5 * 60 * 1000;

function readLoginAttempts(email) {
  try {
    const attempts = JSON.parse(localStorage.getItem(loginAttemptStorageKey) || "{}");
    return attempts[email] || { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeLoginAttempts(email, value) {
  try {
    const attempts = JSON.parse(localStorage.getItem(loginAttemptStorageKey) || "{}");
    attempts[email] = value;
    localStorage.setItem(loginAttemptStorageKey, JSON.stringify(attempts));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function clearLoginAttempts(email) {
  try {
    const attempts = JSON.parse(localStorage.getItem(loginAttemptStorageKey) || "{}");
    delete attempts[email];
    localStorage.setItem(loginAttemptStorageKey, JSON.stringify(attempts));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function recordFailedLoginAttempt(email) {
  const current = readLoginAttempts(email);
  const nextCount = current.count + 1;
  const lockedUntil = nextCount >= maxLoginAttempts ? Date.now() + loginLockoutMs : 0;
  writeLoginAttempts(email, { count: nextCount, lockedUntil });
}

function assertLoginNotLocked(email) {
  const current = readLoginAttempts(email);
  if (current.lockedUntil && current.lockedUntil > Date.now()) {
    const minutes = Math.ceil((current.lockedUntil - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Try again in ${minutes} minute(s).`);
  }
}

function currentLoginDevice() {
  const userAgent = typeof navigator === "undefined" ? "Unknown device" : navigator.userAgent;
  const platform = typeof navigator === "undefined" ? "" : navigator.platform || "";
  return `${platform} ${userAgent}`.trim().slice(0, 240);
}

export function hasAuthConfig() {
  return Boolean(auth);
}

export async function signInWithEmail({ email, password, remember }) {
  assertLoginNotLocked(email);
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    clearLoginAttempts(email);
  } catch (error) {
    recordFailedLoginAttempt(email);
    throw error;
  }

  if (db) {
    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        uid: userCredential.user.uid,
        email,
        lastLoginDevice: currentLoginDevice(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  addAuditLog({
    type: "auth",
    title: "User Signed In",
    message: "User signed in successfully.",
    action: "Sign In",
    userName: userCredential.user.displayName || email,
    userEmail: email,
    userId: userCredential.user.uid,
  }).catch(console.error);

  return userCredential;
}

export async function createStaffAccount({ email, password, fullName, remember }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(userCredential.user, {
    displayName: fullName,
  });
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    fullName,
    email,
    role: "staff",
    accountStatus: "active",
    department: "Medical Records",
    lastLoginDevice: currentLoginDevice(),
    lastLoginAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  addAuditLog({
    type: "auth",
    title: "Staff Account Created",
    message: "A new staff account was created.",
    action: "Account Created",
    userName: fullName,
    userEmail: email,
    userId: userCredential.user.uid,
  }).catch(console.error);

  return userCredential;
}

export function requestPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function signOutCurrentUser() {
  clearSession();
  return auth ? signOut(auth) : Promise.resolve();
}

export async function loginWithBackend({ email, password }, onExpired) {
  const session = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveSession(session, onExpired);
  return session;
}

export async function logoutBackend() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}
