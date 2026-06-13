import { findUserById, listSafeUsers, updateUser } from "../models/userStore.js";
import { httpError } from "../utils/httpError.js";

export async function listUsers(_req, res) {
  res.status(200).json({ data: listSafeUsers() });
}

export async function updateUserRole(req, res) {
  const target = findUserById(req.params.id);
  if (!target) throw httpError(404, "User not found.");

  try {
    const updated = updateUser(target.email, { role: req.body.role });
    if (!updated) throw httpError(404, "User not found.");
    res.status(200).json({ id: req.params.id, role: updated.role });
  } catch (error) {
    if (error.code === "INVALID_ROLE") {
      throw httpError(400, "Role must be admin or staff.");
    }
    throw error;
  }
}
