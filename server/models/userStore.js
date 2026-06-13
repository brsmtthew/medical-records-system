import bcrypt from "bcryptjs";
import crypto from "crypto";

const users = new Map();
const allowedRoles = new Set(["admin", "staff", "nurse", "doctor"]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function seedDefaultAdmin() {
  if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the production admin account.");
  }

  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@example.com");
  if (users.has(email)) return;

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123", 12);
  users.set(email, {
    id: "admin-seed",
    email,
    fullName: "System Administrator",
    passwordHash,
    role: "admin",
    accountStatus: "active",
    failedLoginCount: 0,
    lockedUntil: 0,
    createdAt: new Date().toISOString(),
  });
}

export function findUserByEmail(email) {
  return users.get(normalizeEmail(email)) || null;
}

export function findUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export function listSafeUsers() {
  return [...users.values()].map(({ passwordHash: _passwordHash, ...user }) => user);
}

export async function createUser({ email, fullName, password, role = "staff" }) {
  if (!allowedRoles.has(role)) {
    const error = new Error("Invalid role.");
    error.code = "INVALID_ROLE";
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  if (users.has(normalizedEmail)) {
    const error = new Error("User already exists.");
    error.code = "USER_EXISTS";
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    fullName,
    passwordHash,
    role,
    accountStatus: "active",
    failedLoginCount: 0,
    lockedUntil: 0,
    createdAt: new Date().toISOString(),
  };
  users.set(normalizedEmail, user);
  return user;
}

export function updateUser(email, updates) {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (updates.role && !allowedRoles.has(updates.role)) {
    const error = new Error("Invalid role.");
    error.code = "INVALID_ROLE";
    throw error;
  }
  Object.assign(user, updates, { updatedAt: new Date().toISOString() });
  users.set(user.email, user);
  return user;
}

export function toSafeUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, failedLoginCount: _failedLoginCount, lockedUntil: _lockedUntil, ...safeUser } = user;
  return safeUser;
}
