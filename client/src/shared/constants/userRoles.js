export const userRoles = {
  admin: "admin",
  staff: "staff",
  nurse: "nurse",
  doctor: "doctor",
};

export const medicalRecordsRoles = [userRoles.admin, userRoles.staff];
export const clinicalRoles = [userRoles.nurse, userRoles.doctor];
export const managedUserRoles = [userRoles.staff, userRoles.nurse, userRoles.doctor];
export const allUserRoles = [userRoles.admin, ...managedUserRoles];

export const roleLabels = {
  [userRoles.admin]: "Admin",
  [userRoles.staff]: "Medical Records Staff",
  [userRoles.nurse]: "Nurse",
  [userRoles.doctor]: "Doctor",
};

export function normalizeUserRole(role) {
  return allUserRoles.includes(role) ? role : "unknown";
}

export function roleLabel(role) {
  return roleLabels[normalizeUserRole(role)];
}

export function isMedicalRecordsRole(role) {
  return medicalRecordsRoles.includes(normalizeUserRole(role));
}
