import { Stethoscope } from "lucide-react";
import { doctorClinicLabel, doctorDisplayName, doctorOptionValue } from "@shared/utils/doctors";

export default function DoctorSelect({
  doctors,
  label = "Attending Physician",
  onChange,
  required = false,
  value = "",
}) {
  return (
    <div className="relative">
      <Stethoscope className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select
        className="mrs-field w-full rounded-xl py-3 pl-9 pr-3 text-sm font-bold"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-label={label}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {doctors.map((doctor) => (
          <option key={doctorOptionValue(doctor)} value={doctorOptionValue(doctor)}>
            {doctorDisplayName(doctor)} - {doctorClinicLabel(doctor)}
          </option>
        ))}
      </select>
    </div>
  );
}
