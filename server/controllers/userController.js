import { listSafeUsers, updateUser } from "../models/userStore.js";
import { httpError } from "../utils/httpError.js";

export async function listUsers(_req, res) {
  res.status(200).json({ data: listSafeUsers() });
}

export async function updateUserRole(req, res) {
  try {
    const user = updateUser(req.params.id, { role: req.body.role });
    if (!user) throw httpError(404, "User not found.");
    res.status(200).json({ id: req.params.id, role: user.role });
  } catch (error) {
    if (error.code === "INVALID_ROLE") {
      throw httpError(400, "Role must be admin or staff.");
    }
    throw error;
  }
}
