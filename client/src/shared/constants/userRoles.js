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

export const roleNamePrefixes = {
  [userRoles.admin]: "AD.",
  [userRoles.staff]: "ST.",
  [userRoles.nurse]: "RN.",
  [userRoles.doctor]: "DR.",
};

export const defaultNurseDepartments = [
  "Emergency Room",
  "Nursing Station",
  "NICU",
  "MICU",
  "Ward",
  "OPD",
];

export const defaultDoctorClinics = [
  "Internal Medicine",
  "Surgery",
  "Pediatrics",
  "OB-GYN",
  "Emergency Medicine",
  "Outpatient Clinic",
];

export function normalizeUserRole(role) {
  return allUserRoles.includes(role) ? role : userRoles.staff;
}

export function roleLabel(role) {
  return roleLabels[normalizeUserRole(role)];
}

export function isMedicalRecordsRole(role) {
  return medicalRecordsRoles.includes(normalizeUserRole(role));
}

export function roleNamePrefix(role) {
  return roleNamePrefixes[normalizeUserRole(role)] || "";
}

export function prefixedUserName(name, role) {
  const safeName = String(name || "").trim();
  const prefix = roleNamePrefix(role);
  if (!safeName || !prefix) return safeName;
  return safeName.toUpperCase().startsWith(prefix) ? safeName : `${prefix} ${safeName}`;
}
