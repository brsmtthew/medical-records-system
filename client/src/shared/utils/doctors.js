export function doctorDisplayName(doctor) {
  return doctor?.fullName || doctor?.displayName || doctor?.email || "Unnamed Doctor";
}

export function doctorClinicLabel(doctor) {
  return doctor?.clinic || doctor?.specialty || "No clinic assigned";
}

export function doctorOptionValue(doctor) {
  return doctor?.uid || doctor?.id || "";
}

export function findDoctorById(doctors, doctorId) {
  return doctors.find((doctor) => doctorOptionValue(doctor) === doctorId) || null;
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
