import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import PatientCaseCell from "@shared/components/PatientCaseCell";
import StatusBadge from "@shared/components/StatusBadge";
import PatientCreateConfirmModal from "../modals/PatientCreateConfirmModal";
import PatientDeleteModal from "../modals/PatientDeleteModal";
import PatientEditModal from "../modals/PatientEditModal";
import PatientRegistrationModal from "../modals/PatientRegistrationModal";
import PatientViewModal from "../modals/PatientViewModal";
import {
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Search,
  ClipboardList,
  Users,
  Bed,
  UserRound,
  X,
} from "lucide-react";
import {
  createPatient,
  deletePatient as deletePatientRecord,
  fallbackAdmissionLocations,
  fallbackOutpatientDepartments,
  subscribeToAdmissionLocations,
  subscribeToOutpatientDepartments,
  subscribeToPatients,
  updatePatient as updatePatientRecord,
} from "@features/patients/services/patientService";
import { useAuth } from "@features/auth/context/useAuth";
import { recordTimeValue } from "@shared/utils/recordSorting";

// Keeps patient case numbers consistent whether typed manually or scanned.
function normalizeCaseNumber(value) {
  return String(value || "").trim().toUpperCase();
}

// Normalizes patient names before duplicate and readmission checks.
function normalizePatientName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

// Converts nullable patient fields into search-safe text.
function searchable(value) {
  return String(value || "").toLowerCase();
}

// Keeps outpatient discharge dates aligned with the admission date used by the form.
function normalizePatientDates(patient) {
  const admissionDate = patient.admissionDate || "";
  const dischargeDate = patient.type === "outpatient"
    ? admissionDate
    : patient.dischargeDate || "";

  return {
    ...patient,
    department: patient.department || "",
    admissionDate,
    dischargeDate,
  };
}

// Converts yyyy-mm-dd form values into timestamps for overlap comparisons.
function dateValue(value) {
  if (!value) return 0;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

// Builds an admission-to-discharge range used to detect overlapping inpatient stays.
function patientStayRange(patient) {
  const normalizedPatient = normalizePatientDates(patient);
  const admissionTime = dateValue(normalizedPatient.admissionDate);
  const dischargeTime = dateValue(normalizedPatient.dischargeDate || normalizedPatient.admissionDate);

  return {
    admissionTime,
    dischargeTime,
  };
}

// Detects inpatient date ranges that would conflict for the same patient.
function patientStayOverlaps(firstPatient, secondPatient) {
  if (firstPatient.type !== "inpatient" || secondPatient.type !== "inpatient") {
    return false;
  }

  const firstRange = patientStayRange(firstPatient);
  const secondRange = patientStayRange(secondPatient);

  if (!firstRange.admissionTime || !firstRange.dischargeTime || !secondRange.admissionTime || !secondRange.dischargeTime) {
    return false;
  }

  return firstRange.admissionTime < secondRange.dischargeTime && secondRange.admissionTime < firstRange.dischargeTime;
}

// Falls back through record timestamps to find the earliest saved patient row.
function earliestRecordTime(patient) {
  return recordTimeValue(patient.createdAt) || recordTimeValue(patient.updatedAt);
}

// Finds the earliest admission for a patient while optionally ignoring the row being edited.
function firstAdmissionTime(patientRows, patientName, ignoredPatientId = "") {
  const matchingRows = patientRows
    .filter((patient) => {
      if (ignoredPatientId && patient.id === ignoredPatientId) return false;
      if (ignoredPatientId && patient.caseNumber === ignoredPatientId) return false;
      return normalizePatientName(patient.name || "") === patientName && dateValue(patient.admissionDate);
    })
    .sort((first, second) => {
      const dateDifference = dateValue(first.admissionDate) - dateValue(second.admissionDate);
      if (dateDifference !== 0) return dateDifference;
      return earliestRecordTime(first) - earliestRecordTime(second);
    });

  return matchingRows[0] ? dateValue(matchingRows[0].admissionDate) : 0;
}

// Finds the first saved admission row so record-type labels can stay read-only and automatic.
function firstAdmissionRecordId(patientRows, patientName) {
  const matchingRows = patientRows
    .filter((patient) => normalizePatientName(patient.name || "") === patientName && dateValue(patient.admissionDate))
    .sort((first, second) => {
      const dateDifference = dateValue(first.admissionDate) - dateValue(second.admissionDate);
      if (dateDifference !== 0) return dateDifference;
      const timeDifference = earliestRecordTime(first) - earliestRecordTime(second);
      if (timeDifference !== 0) return timeDifference;
      return String(first.caseNumber || first.id || "").localeCompare(String(second.caseNumber || second.id || ""));
    });

  return matchingRows[0]?.id || matchingRows[0]?.caseNumber || "";
}

// Labels a patient as the first admission unless an older row already exists.
function isFirstAdmissionRecord(patientRows, patient) {
  const patientName = normalizePatientName(patient.name || "");
  const firstRecordId = firstAdmissionRecordId(patientRows, patientName);
  return !firstRecordId || firstRecordId === patient.id || firstRecordId === patient.caseNumber;
}

// Prevents readmission rows from being dated before the first known hospital record.
function hasAdmissionBeforeFirstRecord(patientRows, candidate, ignoredPatientId = "") {
  const normalizedCandidate = normalizePatientDates(candidate);
  const candidateName = normalizePatientName(normalizedCandidate.name || "");
  const candidateAdmissionTime = dateValue(normalizedCandidate.admissionDate);
  const earliestExistingTime = firstAdmissionTime(patientRows, candidateName, ignoredPatientId);

  return Boolean(earliestExistingTime && candidateAdmissionTime && candidateAdmissionTime < earliestExistingTime);
}

// Checks whether a proposed inpatient row overlaps an existing inpatient stay.
function hasOverlappingPatientStay(patientRows, candidate, ignoredPatientId = "") {
  const normalizedCandidate = normalizePatientDates(candidate);
  const candidateName = normalizePatientName(normalizedCandidate.name || "");

  return patientRows.some((patient) => {
    if (ignoredPatientId && patient.id === ignoredPatientId) return false;
    if (ignoredPatientId && patient.caseNumber === ignoredPatientId) return false;

    const normalizedPatient = normalizePatientDates(patient);
    return (
      normalizePatientName(normalizedPatient.name || "") === candidateName &&
      patientStayOverlaps(normalizedPatient, normalizedCandidate)
    );
  });
}

export default function Patients() {
  const { isAdmin, isStaff } = useAuth();
  const canManagePatients = isAdmin || isStaff;
  const canDeletePatients = isAdmin;
  const [patients, setPatients] = useState([]);
  const [admissionLocations, setAdmissionLocations] = useState([]);
  const [outpatientDepartments, setOutpatientDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [admissionDateFilter, setAdmissionDateFilter] = useState("");
  const [dischargeDateFilter, setDischargeDateFilter] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [successMeta, setSuccessMeta] = useState(null);
  const [form, setForm] = useState({
    name: "", caseNumber: "", department: "", recordType: "new", type: "outpatient", admissionDate: "", dischargeDate: ""
  });

  const [viewPatient, setViewPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const [confirmPatient, setConfirmPatient] = useState(null);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  const formNameMatchesExistingPatient = patients.some(
    (p) => normalizePatientName(p.name) === normalizePatientName(form.name),
  );

  useEffect(() => {
    const unsubscribePatients = subscribeToPatients(
      (rows) => {
        setPatients(rows);
        setIsLoading(false);
      },
      (error) => {
        setFormError(error.message || "Unable to load patients from Firebase.");
        setIsLoading(false);
      },
    );

    const unsubscribeAdmissionLocations = subscribeToAdmissionLocations(
      setAdmissionLocations,
      (error) => setFormError(error.message || "Unable to load admission locations from Firebase."),
    );

    const unsubscribeOutpatientDepartments = subscribeToOutpatientDepartments(
      setOutpatientDepartments,
      (error) => setFormError(error.message || "Unable to load outpatient departments from Firebase."),
    );

    return () => {
      unsubscribePatients();
      unsubscribeAdmissionLocations();
      unsubscribeOutpatientDepartments();
    };
  }, []);

  const admissionLocationOptions = admissionLocations.length > 0
    ? admissionLocations.map((location) => location.name)
    : fallbackAdmissionLocations;
  const outpatientDepartmentOptions = outpatientDepartments.length > 0
    ? outpatientDepartments.map((department) => department.name)
    : fallbackOutpatientDepartments;
  const patientDepartmentOptions = form.type === "inpatient"
    ? admissionLocationOptions
    : outpatientDepartmentOptions;
  const patientDepartmentLabel = form.type === "inpatient" ? "Admitted Location" : "Outpatient Department";
  const editDepartmentOptions = editPatient?.type === "inpatient"
    ? admissionLocationOptions
    : outpatientDepartmentOptions;
  const editDepartmentLabel = editPatient?.type === "inpatient" ? "Admitted Location" : "Outpatient Department";

  // Validates registration form fields and prepares a sanitized patient payload.
  const buildPatientFromForm = () => {
    const caseNumber = normalizeCaseNumber(form.caseNumber);
    if (!form.name.trim() || !caseNumber || !form.department || !form.admissionDate) {
      setFormError("Enter the patient name, case number, department/location, and date.");
      return null;
    }
    if (form.type === "inpatient" && !form.dischargeDate) {
      setFormError("Discharge date is required for inpatient records.");
      return null;
    }
    if (form.dischargeDate && dateValue(form.dischargeDate) < dateValue(form.admissionDate)) {
      setFormError("Discharge date cannot be earlier than admission date.");
      return null;
    }
    if (patients.some((p) => normalizeCaseNumber(p.caseNumber) === caseNumber)) {
      setFormError("A patient with this case number already exists.");
      return null;
    }

    const patientName = normalizePatientName(form.name);
    const hasPreviousRecord = patients.some((p) => normalizePatientName(p.name) === patientName);
    const patientCandidate = normalizePatientDates({
      ...form,
      name: patientName,
      recordType: hasPreviousRecord ? "old" : "new",
      caseNumber,
    });

    if (hasOverlappingPatientStay(patients, patientCandidate)) {
      setFormError("This inpatient record overlaps a previous inpatient admission period.");
      return null;
    }
    if (hasAdmissionBeforeFirstRecord(patients, patientCandidate)) {
      setFormError("Readmission date cannot be earlier than this patient's first hospital record.");
      return null;
    }

    return patientCandidate;
  };

  // Opens the final create confirmation after the form passes validation.
  const handleSubmit = (e) => {
    e.preventDefault();
    const newPatient = buildPatientFromForm();
    if (!newPatient) return;
    setConfirmPatient(newPatient);
  };

  // Saves the confirmed patient and clears the registration form.
  const handleConfirmCreate = async () => {
    if (!confirmPatient || pendingAction) return;
    try {
      setPendingAction("create");
      await createPatient(confirmPatient);
      setForm({
        name: "",
        caseNumber: "",
        department: "",
        recordType: "new",
        type: "outpatient",
        admissionDate: "",
        dischargeDate: "",
      });
      setFormError("");
      setSuccessMessage(`${confirmPatient.caseNumber} was added successfully.`);
      setSuccessMeta({
        patientName: confirmPatient.name,
        caseNumber: confirmPatient.caseNumber,
        action: "Patient Created",
        audit: true,
      });
      setIsAddPatientOpen(false);
      setConfirmPatient(null);
    } catch (error) {
      setFormError(error.message || "Unable to save patient to Firebase.");
      setConfirmPatient(null);
    } finally {
      setPendingAction("");
    }
  };

  // Validates and saves changes from the edit patient dialog.
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (pendingAction) return;
    const previousCaseNumber = editPatient.previousCaseNumber || editPatient.id;
    const caseNumber = normalizeCaseNumber(editPatient.caseNumber);
    if (!editPatient.name.trim() || !caseNumber || !editPatient.department || !editPatient.admissionDate) {
      setEditError("Patient name, case number, department/location, and date are required.");
      return;
    }
    if (editPatient.type === "inpatient" && !editPatient.dischargeDate) {
      setEditError("Discharge date is required for inpatient records.");
      return;
    }
    if (editPatient.dischargeDate && dateValue(editPatient.dischargeDate) < dateValue(editPatient.admissionDate)) {
      setEditError("Discharge date cannot be earlier than admission date.");
      return;
    }
    const duplicateCase = patients.some(
      (p) => p.id !== editPatient.id && normalizeCaseNumber(p.caseNumber) === caseNumber
    );
    if (duplicateCase) {
      setEditError("Another patient already uses this case number.");
      return;
    }

    const patientName = normalizePatientName(editPatient.name);
    const hasPreviousRecord = patients.some(
      (p) => p.id !== editPatient.id && normalizePatientName(p.name) === patientName,
    );
    const patientCandidate = normalizePatientDates({
      name: patientName,
      caseNumber,
      department: editPatient.department || "",
      recordType: hasPreviousRecord ? "old" : editPatient.recordType || "new",
      type: editPatient.type,
      admissionDate: editPatient.admissionDate || "",
      dischargeDate: editPatient.dischargeDate || "",
    });

    if (hasOverlappingPatientStay(patients, patientCandidate, previousCaseNumber)) {
      setEditError("This inpatient record overlaps a previous inpatient admission period.");
      return;
    }
    if (hasAdmissionBeforeFirstRecord(patients, patientCandidate, previousCaseNumber)) {
      setEditError("Readmission date cannot be earlier than this patient's first hospital record.");
      return;
    }

    try {
      setPendingAction("update");
      await updatePatientRecord(previousCaseNumber, patientCandidate);
      setEditPatient(null);
      setEditError("");
      setSuccessMessage(`${caseNumber} was updated successfully.`);
      setSuccessMeta({
        patientName,
        caseNumber,
        action: "Patient Updated",
        audit: true,
      });
    } catch (error) {
      setEditError(error.message || "Unable to update patient in Firebase.");
    } finally {
      setPendingAction("");
    }
  };

  // Deletes a patient record after the delete dialog is confirmed.
  const handleDelete = async (caseNumber) => {
    if (pendingAction) return;
    const patientName = deletePatient?.name || "";
    try {
      setPendingAction("delete");
      await deletePatientRecord(caseNumber);
      setDeletePatient(null);
      setSuccessMessage(`${caseNumber} was deleted successfully.`);
      setSuccessMeta({
        patientName,
        caseNumber,
        action: "Patient Deleted",
        audit: true,
      });
    } catch (error) {
      setFormError(error.message || "Unable to delete patient from Firebase.");
    } finally {
      setPendingAction("");
    }
  };

  // Converts the rendered barcode SVG into a downloadable PNG.
  const downloadBarcode = (caseNumber) => {
    const svg = document.getElementById(`barcode-${caseNumber}`);
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(xml);
    const image64 = "data:image/svg+xml;base64," + svg64;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `Barcode-${caseNumber}.png`;
      link.click();
    };
    img.src = image64;
  };

  const filteredPatients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return patients.filter((p) => {
      const matchesSearch =
        !search ||
        searchable(p.name).includes(search) ||
        searchable(p.caseNumber).includes(search) ||
        searchable(p.department).includes(search) ||
        searchable(p.admissionDate).includes(search) ||
        searchable(p.dischargeDate).includes(search);
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      const matchesAdmission = !admissionDateFilter || p.admissionDate === admissionDateFilter;
      const matchesDischarge = !dischargeDateFilter || p.dischargeDate === dischargeDateFilter;

      return matchesSearch && matchesType && matchesAdmission && matchesDischarge;
    });
  }, [admissionDateFilter, dischargeDateFilter, patients, searchTerm, typeFilter]);

  const stats = [
    { label: "Total Patients", value: patients.length, icon: Users, color: "bg-green-100 text-green-700" },
    { label: "Inpatients", value: patients.filter((p) => p.type === "inpatient").length, icon: Bed, color: "bg-emerald-100 text-emerald-700" },
    { label: "Outpatients", value: patients.filter((p) => p.type === "outpatient").length, icon: UserRound, color: "bg-blue-100 text-blue-700" },
  ];

  // Clears all patient table filters with a notice when there is nothing to reset.
  const resetFilters = () => {
    if (!searchTerm && typeFilter === "all" && !admissionDateFilter && !dischargeDateFilter) {
      setInfoMessage("No patient filters to reset.");
      return;
    }
    setSearchTerm("");
    setTypeFilter("all");
    setAdmissionDateFilter("");
    setDischargeDateFilter("");
    setInfoMessage("Patient filters were reset.");
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 grid shrink-0 grid-cols-1 gap-2 px-1 xl:grid-cols-[minmax(18rem,auto)_minmax(0,1fr)] xl:items-end">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
            Patient <span className="text-green-700">Registry</span>
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Hospital records and management.</p>
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-1.5 xl:justify-self-end xl:w-[min(42rem,100%)]">
          {stats.map((item) => (
            <div
              key={item.label}
              className="mrs-dashboard-stat mrs-dashboard-stat-fill mrs-surface rounded-xl p-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-base font-black leading-none text-slate-800">{item.value}</p>
                </div>
                <div className={`rounded-lg p-1.5 ${item.color}`}>
                  <item.icon size={15} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex flex-1 flex-col">
          <div className="mb-2 flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-black text-slate-800 uppercase">Registered Patients</h2>
              <p className="text-xs font-bold text-slate-400">
                Showing {filteredPatients.length} of {patients.length} records
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {canManagePatients && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setIsAddPatientOpen(true);
                  }}
                  className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                >
                  <UserPlus size={14} />
                  Add Patient
                </button>
              )}
              {[
                { id: "all", label: "All" },
                { id: "inpatient", label: "Inpatient" },
                { id: "outpatient", label: "Outpatient" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setTypeFilter(filter.id)}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase transition-colors ${
                    typeFilter === filter.id
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-green-200 hover:text-green-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mrs-panel mb-2 rounded-xl p-2.5">
            <div className="grid gap-2 lg:grid-cols-[minmax(18rem,1fr)_10rem_10rem_7rem]">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search name, case number, location, admission, or discharge"
                  aria-label="Search patients"
                  className="mrs-field w-full rounded-lg py-2.5 pl-10 pr-3 text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <input
                type="date"
                value={admissionDateFilter}
                onChange={(event) => setAdmissionDateFilter(event.target.value)}
                className="mrs-field w-full rounded-lg px-3 py-2.5 text-xs font-black"
                aria-label="Filter by admission date"
              />

              <input
                type="date"
                value={dischargeDateFilter}
                onChange={(event) => setDischargeDateFilter(event.target.value)}
                className="mrs-field w-full rounded-lg px-3 py-2.5 text-xs font-black"
                aria-label="Filter by discharge date"
              />

              <button
                onClick={resetFilters}
                className="mrs-soft-button inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[10px] font-black uppercase"
              >
                <X size={14} />
                Reset
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto pr-1">
            <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-y-1.5">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left">
                  <th className="w-[30%] px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                  <th className="w-[20%] px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location / Dept.</th>
                  <th className="w-[22%] px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</th>
                  <th className="w-[12%] px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="w-[16%] px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="mrs-table-row group">
                    <td className="px-3 py-2 rounded-l-xl border-y border-l border-slate-200 bg-white group-hover:bg-slate-50">
                      <PatientCaseCell patientName={p.name} caseNumber={p.caseNumber} />
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase ${
                          isFirstAdmissionRecord(patients, p)
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {isFirstAdmissionRecord(patients, p) ? "First Admission" : "Old / Readmit"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-y border-slate-200 bg-white group-hover:bg-slate-50">
                      <div className="font-black text-slate-800 text-xs uppercase break-words">
                        {p.department || "Unassigned"}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-y border-slate-200 bg-white group-hover:bg-slate-50">
                      <div className="text-[10px] font-black text-amber-700 uppercase">Admission: {p.admissionDate || "--"}</div>
                      <div className="text-[10px] font-black text-green-700 uppercase">Discharge: {p.dischargeDate || "Active"}</div>
                    </td>
                    <td className="px-3 py-2 border-y border-slate-200 bg-white group-hover:bg-slate-50">
                      <StatusBadge tone={p.type === "inpatient" ? "inpatient" : "outpatient"}>
                        {p.type}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 rounded-r-xl border-y border-r border-slate-200 bg-white text-right group-hover:bg-slate-50">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewPatient(p)} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700" title="View patient">
                          <Eye size={16} />
                        </button>
                        {canManagePatients && (
                          <button onClick={() => { setEditPatient({ ...p, previousCaseNumber: p.caseNumber }); setEditError(""); }} className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title="Edit patient">
                            <Edit size={16} />
                          </button>
                        )}
                        {canDeletePatients && (
                          <button onClick={() => setDeletePatient(p)} className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 transition-colors hover:border-red-200 hover:bg-red-100 hover:text-red-700" title="Delete patient">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan="5" className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                      <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-black text-slate-700 uppercase">
                        {isLoading ? "Loading patients..." : "No patients found"}
                      </p>
                      <p className="text-sm text-slate-400 font-semibold mt-1">
                        {isLoading ? "Reading records from Firebase." : "Try changing the search or type filter."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        <PatientRegistrationModal
          form={form}
          formNameMatchesExistingPatient={formNameMatchesExistingPatient}
          isOpen={canManagePatients && isAddPatientOpen}
          normalizePatientName={normalizePatientName}
          onClose={() => setIsAddPatientOpen(false)}
          onSubmit={handleSubmit}
          patientDepartmentLabel={patientDepartmentLabel}
          patientDepartmentOptions={patientDepartmentOptions}
          patients={patients}
          setForm={setForm}
          setFormError={setFormError}
        />

      </div>

      <PatientEditModal
        editDepartmentLabel={editDepartmentLabel}
        editDepartmentOptions={editDepartmentOptions}
        isFirstAdmissionRecord={isFirstAdmissionRecord}
        normalizePatientName={normalizePatientName}
        onClose={() => setEditPatient(null)}
        onSubmit={handleUpdate}
        patient={canManagePatients ? editPatient : null}
        patients={patients}
        pendingAction={pendingAction}
        setEditError={setEditError}
        setPatient={setEditPatient}
      />
      <PatientViewModal
        isFirstAdmissionRecord={isFirstAdmissionRecord}
        onClose={() => setViewPatient(null)}
        onDownloadBarcode={downloadBarcode}
        patient={viewPatient}
        patients={patients}
      />
      <PatientCreateConfirmModal
        canManagePatients={canManagePatients}
        isSaving={pendingAction === "create"}
        onCancel={() => setConfirmPatient(null)}
        onConfirm={handleConfirmCreate}
        patient={confirmPatient}
      />
      <PatientDeleteModal
        canDeletePatients={canDeletePatients}
        isDeleting={pendingAction === "delete"}
        onCancel={() => setDeletePatient(null)}
        onConfirm={handleDelete}
        patient={deletePatient}
      />
      <FloatingToast
        toast={
          editError
            ? { type: "error", message: editError }
            : formError
              ? { type: "error", message: formError }
              : infoMessage
                ? { type: "info", message: infoMessage }
              : successMessage
                ? { type: "success", title: "Patient Record", message: successMessage, ...successMeta }
                : null
        }
        onClose={() => {
          setEditError("");
          setFormError("");
          setInfoMessage("");
          setSuccessMessage("");
          setSuccessMeta(null);
        }}
      />
    </DashboardLayout>
  );
}
