import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import StatusBadge from "../components/StatusBadge";
import Barcode from "react-barcode";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Search,
  Download,
  ClipboardList,
  Save,
  ArrowRight,
  Users,
  Bed,
  UserRound,
  X
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
} from "../services/patientService";
import { useAuth } from "../context/useAuth";
import { recordTimeValue } from "../utils/recordSorting";

// Keeps patient case numbers consistent whether typed manually or scanned.
function normalizeCaseNumber(value) {
  return value.trim().toUpperCase();
}

// Normalizes patient names before duplicate and readmission checks.
function normalizePatientName(value) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
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
      <div className="mb-2 flex shrink-0 flex-col justify-between gap-2 px-1 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
            PATIENT <span className="text-green-600">REGISTRY</span>
          </h1>
          <p className="mt-0.5 text-xs font-medium text-gray-400">Hospital Records & Management</p>
        </div>
        {canManagePatients && (
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setIsAddPatientOpen(true);
            }}
            className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase"
          >
            <UserPlus size={16} />
            Add Patient
          </button>
        )}
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-3 gap-2">
        {stats.map((item) => (
          <div
            key={item.label}
            className="mrs-surface rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xl font-black text-slate-800">{item.value}</p>
              </div>
              <div className={`rounded-lg p-2 ${item.color}`}>
                <item.icon size={18} />
              </div>
            </div>
          </div>
        ))}
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
            <div className="flex flex-wrap gap-2">
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-[10px] font-black uppercase text-slate-500 transition-colors hover:border-black hover:text-black"
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
                      <div className="font-black text-gray-900 text-sm uppercase leading-tight break-words">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <code className="text-[11px] font-mono text-green-900 font-black tracking-wide">{p.caseNumber}</code>
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
                      <div className="text-[10px] font-black text-slate-700 uppercase">Admission: {p.admissionDate || "--"}</div>
                      <div className="text-[10px] font-black text-slate-700 uppercase">Discharge: {p.dischargeDate || "Active"}</div>
                    </td>
                    <td className="px-3 py-2 border-y border-slate-200 bg-white group-hover:bg-slate-50">
                      <StatusBadge tone={p.type === "inpatient" ? "inpatient" : "outpatient"}>
                        {p.type}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 rounded-r-xl border-y border-r border-slate-200 bg-white text-right group-hover:bg-slate-50">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewPatient(p)} className="rounded-lg border border-transparent p-1.5 transition-all hover:border-black hover:bg-gray-50">
                          <Eye size={16} />
                        </button>
                        {canManagePatients && (
                          <button onClick={() => { setEditPatient({ ...p, previousCaseNumber: p.caseNumber }); setEditError(""); }} className="rounded-lg border border-transparent p-1.5 transition-all hover:border-black hover:bg-gray-50">
                            <Edit size={16} />
                          </button>
                        )}
                        {canDeletePatients && (
                          <button onClick={() => setDeletePatient(p)} className="rounded-lg border border-transparent p-1.5 text-red-500 transition-all hover:border-black hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan="5" className="bg-white rounded-2xl border-2 border-black p-10 text-center">
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

        {canManagePatients && isAddPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <Motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddPatientOpen(false)} />
          <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-hidden rounded-2xl p-4" >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
                <UserPlus size={20} />
              </div>
              <h2 className="font-black text-lg text-gray-900 uppercase tracking-tight">Register Patient</h2>
              <button type="button" onClick={() => setIsAddPatientOpen(false)} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-black" aria-label="Close add patient">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid max-h-[calc(100dvh-8rem)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Patient Name</label>
                <input
                  className="mrs-field w-full p-3 rounded-xl text-sm font-bold"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const hasExistingRecord = patients.some(
                      (p) => normalizePatientName(p.name) === normalizePatientName(name),
                    );
                    setForm({ ...form, name, recordType: hasExistingRecord ? "old" : "new" });
                    setFormError("");
                  }}
                  placeholder="Full Name"
                  required
                />
                {formNameMatchesExistingPatient && (
                  <p className="text-[10px] font-black uppercase text-amber-600 px-1">
                    Existing patient name found.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Case ID</label>
                <input
                  className="mrs-field w-full p-3 rounded-xl font-mono text-sm font-bold"
                  value={form.caseNumber}
                  onChange={(e) => {
                    setForm({ ...form, caseNumber: e.target.value.toUpperCase() });
                    setFormError("");
                  }}
                  placeholder="Enter case number from patient system"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Care Status</label>
                <select
                  className="mrs-field w-full p-3 rounded-xl text-sm font-bold cursor-pointer"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setForm({
                      ...form,
                      type,
                      department: "",
                      dischargeDate: type === "outpatient" ? form.admissionDate : "",
                    });
                    setFormError("");
                  }}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  {patientDepartmentLabel}
                </label>
                <select
                  className="mrs-field w-full p-3 rounded-xl text-sm font-bold cursor-pointer"
                  value={form.department}
                  onChange={(e) => {
                    setForm({ ...form, department: e.target.value });
                    setFormError("");
                  }}
                  required
                >
                  <option value="">Select {patientDepartmentLabel.toLowerCase()}</option>
                  {patientDepartmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admission</label>
                  <input
                    type="date"
                    className="mrs-field w-full p-3 rounded-xl text-xs font-bold"
                    value={form.admissionDate}
                    onChange={(e) => {
                      const admissionDate = e.target.value;
                      setForm({
                        ...form,
                        admissionDate,
                        dischargeDate: form.type === "outpatient" ? admissionDate : form.dischargeDate,
                      });
                      setFormError("");
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Discharge</label>
                  <input
                    type="date"
                    className="mrs-field w-full p-3 rounded-xl text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
                    value={form.dischargeDate}
                    onChange={(e) => {
                      setForm({ ...form, dischargeDate: e.target.value });
                      setFormError("");
                    }}
                    disabled={form.type === "outpatient"}
                    required={form.type === "inpatient"}
                  />
                </div>
              </div>

              <button className="mrs-primary-button flex w-full items-center justify-center gap-2 rounded-xl py-3 font-black transition-all sm:col-span-2">
                ADD RECORD <ArrowRight size={18} />
              </button>
            </form>
          </Motion.div>
        </div>
        )}

      </div>

      {/* EDIT MODAL - FULL FUNCTIONALITY RESTORED */}
      <AnimatePresence>
        {canManagePatients && editPatient && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditPatient(null)} />
            <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-8" >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl"><Edit size={24} /></div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Update Record</h2>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Name</label>
                    <input
                      className="w-full border-2 border-black p-4 rounded-xl font-bold outline-none focus:bg-gray-50"
                      value={editPatient.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const hasExistingRecord = patients.some(
                          (p) => p.id !== editPatient.id && normalizePatientName(p.name) === normalizePatientName(name),
                        );
                        setEditPatient({ ...editPatient, name, recordType: hasExistingRecord ? "old" : editPatient.recordType || "new" });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Case Number</label>
                    <input className="w-full border-2 border-black p-4 rounded-xl font-mono font-bold outline-none focus:bg-gray-50" value={editPatient.caseNumber} onChange={(e) => { setEditPatient({ ...editPatient, caseNumber: e.target.value.toUpperCase() }); setEditError(""); }} required />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">{editDepartmentLabel}</label>
                    <select
                      className="w-full border-2 border-black p-4 rounded-xl font-bold bg-white"
                      value={editPatient.department || ""}
                      onChange={(e) => {
                        setEditPatient({ ...editPatient, department: e.target.value });
                        setEditError("");
                      }}
                      required
                    >
                      <option value="">Select {editDepartmentLabel.toLowerCase()}</option>
                      {editDepartmentOptions.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Admission</label>
                    <input
                      type="date"
                      className="w-full border-2 border-black p-3 rounded-xl font-bold"
                      value={editPatient.admissionDate}
                      onChange={(e) => {
                        const admissionDate = e.target.value;
                        setEditPatient({
                          ...editPatient,
                          admissionDate,
                          dischargeDate: editPatient.type === "outpatient" ? admissionDate : editPatient.dischargeDate,
                        });
                        setEditError("");
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Discharge</label>
                    <input
                      type="date"
                      className="w-full border-2 border-black p-3 rounded-xl font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      value={editPatient.dischargeDate}
                      onChange={(e) => {
                        setEditPatient({ ...editPatient, dischargeDate: e.target.value });
                        setEditError("");
                      }}
                      disabled={editPatient.type === "outpatient"}
                      required={editPatient.type === "inpatient"}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Patient Record</label>
                    <div className="w-full border-2 border-black p-4 rounded-xl font-bold bg-slate-50 text-slate-700">
                      {isFirstAdmissionRecord(patients, editPatient) ? "First Admission" : "Old Patient / Readmission"}
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase ml-1">Care Status</label>
                    <select
                      className="w-full border-2 border-black p-4 rounded-xl font-bold"
                      value={editPatient.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setEditPatient({
                          ...editPatient,
                          type,
                          department: "",
                          dischargeDate: type === "outpatient" ? editPatient.admissionDate : "",
                        });
                        setEditError("");
                      }}
                    >
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setEditPatient(null)} className="flex-1 py-4 font-black text-gray-500 uppercase">Cancel</button>
                  <button type="submit" disabled={pendingAction === "update"} className="mrs-blue-button flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
                    <Save size={20} /> {pendingAction === "update" ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {viewPatient && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setViewPatient(null)} />
            <Motion.div initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 text-center sm:p-10" >
                <button
                  type="button"
                  onClick={() => setViewPatient(null)}
                  className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl border-2 border-transparent text-slate-400 transition-colors hover:border-black hover:bg-slate-50 hover:text-black"
                  aria-label="Close patient view"
                >
                  <X size={18} />
                </button>
                <div className="size-20 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6"><ClipboardList size={38} /></div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter">{viewPatient.name}</h2>
                <p className="text-gray-500 font-mono font-bold text-sm mb-8">{viewPatient.caseNumber}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Record</p>
                    <p className="font-black text-gray-900 uppercase">
                      {isFirstAdmissionRecord(patients, viewPatient) ? "First Admission" : "Old / Readmission"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                      {viewPatient.type === "inpatient" ? "Admitted Location" : "Outpatient Department"}
                    </p>
                    <p className="font-black text-gray-900 uppercase">{viewPatient.department || "Unassigned"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Admission</p>
                    <p className="font-black text-gray-900">{viewPatient.admissionDate || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Discharge</p>
                    <p className="font-black text-gray-900">{viewPatient.dischargeDate || "Ongoing"}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border-2 border-black">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Type</p>
                    <p className="font-black text-gray-900 capitalize">{viewPatient.type}</p>
                  </div>
                </div>

                <div className="mrs-card p-6 rounded-2xl mb-8 flex justify-center">
                   <Barcode id={`barcode-${viewPatient.caseNumber}`} value={viewPatient.caseNumber} width={1.8} height={60} fontSize={14} />
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setViewPatient(null)}
                    className="flex w-full items-center justify-center rounded-xl border-2 border-black bg-white py-4 font-black uppercase text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button onClick={() => downloadBarcode(viewPatient.caseNumber)} className="mrs-blue-button w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all" >
                    <Download size={20} /> Download PNG
                  </button>
                </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CONFIRMATION MODAL */}
      <AnimatePresence>
        {canManagePatients && confirmPatient && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPatient(null)} />
            <Motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="mrs-panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 sm:p-7"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-green-50 text-green-700 rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">Add Patient Record?</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">Please review before saving</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Patient</p>
                  <p className="font-black text-slate-900 uppercase">{confirmPatient.name}</p>
                  <p className="font-mono text-sm font-black text-green-800">{confirmPatient.caseNumber}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Record</p>
                    <p className="font-black text-slate-800 uppercase">
                      {confirmPatient.recordType === "old" ? "Old / Readmission" : "First Admission"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      {confirmPatient.type === "inpatient" ? "Admitted Location" : "Outpatient Department"}
                    </p>
                    <p className="font-black text-slate-800 uppercase">{confirmPatient.department}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Type</p>
                    <p className="font-black text-slate-800 uppercase">{confirmPatient.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Admission</p>
                    <p className="font-black text-slate-800">{confirmPatient.admissionDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Discharge</p>
                    <p className="font-black text-slate-800">{confirmPatient.dischargeDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPatient(null)}
                  disabled={pendingAction === "create"}
                  className="flex-1 py-3 font-black text-gray-500 uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreate}
                  disabled={pendingAction === "create"}
                  className="mrs-primary-button flex-1 py-3 rounded-xl font-black uppercase disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendingAction === "create" ? "Saving..." : "Confirm"}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {canDeletePatients && deletePatient && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div className="absolute inset-0 bg-black/40" onClick={() => setDeletePatient(null)} />
            <Motion.div className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center sm:p-10">
              <div className="size-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Trash2 size={34} /></div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Delete?</h3>
              <p className="text-gray-500 font-bold text-sm mb-10 leading-tight">Are you sure you want to remove <span className="text-black">{deletePatient.name}</span>?</p>
              <div className="flex gap-4">
                <button onClick={() => setDeletePatient(null)} disabled={pendingAction === "delete"} className="flex-1 py-4 font-black text-gray-400 uppercase">No</button>
                <button onClick={() => handleDelete(deletePatient.caseNumber)} disabled={pendingAction === "delete"} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black shadow-lg shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-70">{pendingAction === "delete" ? "Deleting..." : "Yes"}</button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
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
