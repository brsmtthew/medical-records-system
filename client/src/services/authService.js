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

export function hasAuthConfig() {
  return Boolean(auth);
}

export async function signInWithEmail({ email, password, remember }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  if (db) {
    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        uid: userCredential.user.uid,
        email,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
