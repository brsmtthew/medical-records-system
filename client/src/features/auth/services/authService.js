import { deleteApp, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db, firebaseConfig } from "@/firebaseClient";
import { apiRequest } from "@services/apiClient";
import { clearPersistentSignIn, clearSession, savePersistentSignIn, saveSession } from "@services/sessionService";
import { addAuditLog, getActiveUserProfile } from "@services/recordsService";
import { managedUserRoles, normalizeUserRole, roleLabel, userRoles } from "@shared/constants/userRoles";
import { isStrongPassword } from "@shared/utils/security";

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

  await addAuditLog({
    type: "auth",
    title: "User Signed In",
    message: "User signed in successfully.",
    action: "Sign In",
    userName: userCredential.user.displayName || email,
    userEmail: email,
    userId: userCredential.user.uid,
  }).catch((error) => console.error("Audit log write failed:", error));

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

// Builds the temporary password as role + the email's local part, e.g. a nurse
// with email joelasentista@hospital.com gets "nursejoelasentista". It is only used
// for the first sign-in; the user is then forced to set their own password.
function buildTemporaryPassword(role, email) {
  const localPart = String(email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const password = `${role}${localPart}`;
  // Firebase requires at least 6 characters; pad rare short values.
  return password.length >= 6 ? password : `${password}000000`.slice(0, Math.max(6, password.length));
}

export async function createManagedUserAccount({ email, fullName, role, department, clinic, specialty, licenseNumber }) {
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
  const initialPassword = buildTemporaryPassword(safeProfile.role, safeProfile.email);
  const secondaryApp = initializeApp(firebaseConfig, `mrs-managed-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, safeProfile.email, initialPassword);
    await updateProfile(userCredential.user, { displayName: safeProfile.fullName });
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      ...safeProfile,
      // The user signs in with the temporary password, then is forced to set their
      // own password before reaching the dashboard (see FirstLoginPasswordSetup).
      mustChangePassword: true,
      createdBy: auth.currentUser.uid,
      createdByName: adminProfile?.fullName || auth.currentUser.displayName || auth.currentUser.email || "Admin",
      lastLoginDevice: "",
      lastLoginAt: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addAuditLog({
      type: "user",
      title: "Managed Account Created",
      message: `${roleLabel(safeProfile.role)} account was created by admin with a temporary password.`,
      action: "Create Managed User",
      userName: safeProfile.fullName,
      userEmail: safeProfile.email,
      userId: userCredential.user.uid,
    }).catch((error) => console.error("Audit log write failed:", error));

    return { uid: userCredential.user.uid, temporaryPassword: initialPassword };
  } finally {
    if (secondaryAuth.currentUser) {
      await signOut(secondaryAuth).catch(() => {});
    }
    await deleteApp(secondaryApp).catch(() => {});
  }
}

// First-login flow: the user re-enters the temporary password (to reauthenticate),
// sets a new password, and we clear the mustChangePassword flag so the dashboard
// gate in ProtectedRoute opens.
export async function completeFirstLoginPasswordSetup({ currentPassword, newPassword }) {
  if (!auth?.currentUser || !db) {
    throw new Error("You must be signed in to set your password.");
  }
  if (!isStrongPassword(newPassword)) {
    throw new Error("New password must be at least 8 characters with uppercase, lowercase, and a number.");
  }

  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch {
    throw new Error("The temporary password is incorrect.");
  }
  await updatePassword(user, newPassword);
  await setDoc(
    doc(db, "users", user.uid),
    { mustChangePassword: false, updatedAt: serverTimestamp() },
    { merge: true },
  );

  await addAuditLog({
    type: "auth",
    title: "Password Set",
    message: "User set a new password on first sign-in.",
    action: "First Login Password Setup",
    userName: user.displayName || user.email,
    userEmail: user.email,
    userId: user.uid,
  }).catch((error) => console.error("Audit log write failed:", error));
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
