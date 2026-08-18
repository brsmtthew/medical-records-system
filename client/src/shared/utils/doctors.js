// Doctor "type" classifies a physician in the directory. "clinic" means they hold a
// hospital clinic; visiting/affiliated doctors usually have no clinic and no login.
export const doctorTypes = [
  { value: "clinic", label: "Hospital Clinic" },
  { value: "visiting", label: "Visiting" },
  { value: "affiliated", label: "Affiliated" },
];

export function doctorTypeLabel(value) {
  return doctorTypes.find((type) => type.value === value)?.label || "";
}

// Works for both physician-directory records ({ name, clinic, doctorType }) and
// legacy doctor login accounts ({ fullName, displayName, email }).
export function doctorDisplayName(doctor) {
  return doctor?.name || doctor?.fullName || doctor?.displayName || doctor?.email || "Unnamed Doctor";
}

export function doctorClinicLabel(doctor) {
  if (doctor?.clinic) return doctor.clinic;
  if (doctor?.specialty) return doctor.specialty;
  const typeLabel = doctorTypeLabel(doctor?.doctorType);
  return typeLabel || "No clinic assigned";
}

export function doctorOptionValue(doctor) {
  return doctor?.id || doctor?.uid || "";
}

export function findDoctorById(doctors, doctorId) {
  if (!doctorId) return null;
  // Prefer a direct id match; fall back to a directory entry linked to a legacy
  // account uid so re-editing older patient records still resolves the doctor.
  return doctors.find((doctor) => doctorOptionValue(doctor) === doctorId)
    || doctors.find((doctor) => doctor?.linkedUserId && doctor.linkedUserId === doctorId)
    || null;
}

export function buildAttendingDoctorFields(doctor) {
  if (!doctor) {
    return {
      attendingDoctorId: "",
      attendingDoctorName: "",
      attendingDoctorClinic: "",
    };
  }

  return {
    attendingDoctorId: doctorOptionValue(doctor),
    attendingDoctorName: doctorDisplayName(doctor),
    attendingDoctorClinic: doctor.clinic || "",
  };
}

// Builds the attending-physician option list. The physician directory is the source
// of truth; doctor login accounts that are not yet linked to a directory entry are
// still included so nothing disappears during the transition.
export function mergeDoctorSources(physicians = [], doctorAccounts = []) {
  const activePhysicians = physicians.filter((physician) => (physician?.status || "active") !== "inactive");
  const linkedUserIds = new Set(activePhysicians.map((physician) => physician?.linkedUserId).filter(Boolean));
  const unlinkedAccounts = doctorAccounts.filter((account) => {
    const uid = account?.uid || account?.id;
    return uid && !linkedUserIds.has(uid);
  });

  return [...activePhysicians, ...unlinkedAccounts].sort((first, second) => (
    doctorDisplayName(first).localeCompare(doctorDisplayName(second))
  ));
}
