import { deleteApp, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db, firebaseConfig } from "@/firebaseClient";
import { apiRequest } from "@services/apiClient";
import { clearPersistentSignIn, clearSession, savePersistentSignIn, saveSession } from "@services/sessionService";
import { addAuditLog, getActiveUserProfile } from "@services/recordsService";
import { managedUserRoles, normalizeUserRole, roleLabel, userRoles } from "@shared/constants/userRoles";

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
  savePersistentSignIn(remember);
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    clearLoginAttempts(email);
  } catch (error) {
    savePersistentSignIn(false);
    recordFailedLoginAttempt(email);
    throw error;
  }

  if (db) {
    const userRef = doc(db, "users", userCredential.user.uid);
    const userSnapshot = await getDoc(userRef);
    const userProfile = userSnapshot.exists() ? userSnapshot.data() : null;

    if (!userProfile) {
      await signOut(auth);
      throw new Error("This account has been removed. Contact an administrator.");
    }

    if (["deleted", "disabled"].includes(userProfile.accountStatus)) {
      await signOut(auth);
      throw new Error("This account is not active. Contact an administrator.");
    }

    await setDoc(
      userRef,
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
  savePersistentSignIn(remember);
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    savePersistentSignIn(false);
    throw error;
  }

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

function cleanManagedAccountProfile(profile) {
  const role = normalizeUserRole(profile.role);
  if (!managedUserRoles.includes(role)) {
    throw new Error("Admin can create staff, nurse, or doctor accounts.");
  }

  const fullName = String(profile.fullName || "").trim().replace(/\s+/g, " ");
  const email = String(profile.email || "").trim().toLowerCase();
  const department = String(profile.department || "").trim().replace(/\s+/g, " ").toUpperCase();
  const clinic = String(profile.clinic || "").trim().replace(/\s+/g, " ");
  const specialty = String(profile.specialty || "").trim().replace(/\s+/g, " ");
  const licenseNumber = String(profile.licenseNumber || "").trim().replace(/\s+/g, " ").toUpperCase();

  if (!fullName) throw new Error("Enter the user's full name.");
  if (!email) throw new Error("Enter the user's email address.");
  if (role === userRoles.nurse && !department) throw new Error("Assign a department for nurse accounts.");
  if (role === userRoles.doctor && !clinic) throw new Error("Assign a clinic for doctor accounts.");

  return {
    fullName,
    email,
    role,
    accountStatus: "active",
    department: role === userRoles.doctor ? "" : department || "MEDICAL RECORDS",
    clinic: role === userRoles.doctor ? clinic : "",
    specialty: role === userRoles.doctor ? specialty : "",
    licenseNumber,
    position: roleLabel(role),
  };
}

export async function createManagedUserAccount({ email, password, fullName, role, department, clinic, specialty, licenseNumber }) {
  if (!auth?.currentUser || !db) {
    throw new Error("Sign in as admin before creating accounts.");
  }

  const adminProfile = getActiveUserProfile(auth.currentUser.uid);
  if (normalizeUserRole(adminProfile?.role) !== userRoles.admin) {
    throw new Error("Only admin accounts can create system users.");
  }

  const safeProfile = cleanManagedAccountProfile({
    email,
    fullName,
    role,
    department,
    clinic,
    specialty,
    licenseNumber,
  });
  const secondaryApp = initializeApp(firebaseConfig, `mrs-managed-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, safeProfile.email, password);
    await updateProfile(userCredential.user, { displayName: safeProfile.fullName });
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      ...safeProfile,
      createdBy: auth.currentUser.uid,
      createdByName: adminProfile?.fullName || auth.currentUser.displayName || auth.currentUser.email || "Admin",
      lastLoginDevice: "",
      lastLoginAt: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    addAuditLog({
      type: "user",
      title: "Managed Account Created",
      message: `${roleLabel(safeProfile.role)} account was created by admin.`,
      action: "Create Managed User",
      userName: safeProfile.fullName,
      userEmail: safeProfile.email,
      userId: userCredential.user.uid,
    }).catch(console.error);

    return userCredential.user.uid;
  } finally {
    if (secondaryAuth.currentUser) {
      await signOut(secondaryAuth).catch(() => {});
    }
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export function requestPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function signOutCurrentUser() {
  clearSession();
  clearPersistentSignIn();
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
