import { nowLocalKey, trackingDateRangeColumn, trackingDateTimeColumn } from "./trackingPageHelpers";

export const documentTypes = [
  { value: "medicalCertificate", label: "Medical Certificate" },
  { value: "medicalAbstract", label: "Clinical Abstract" },
  { value: "certificateOfConfinement", label: "Certificate of Confinement" },
];

export const certificateTypes = [
  { value: "birth", label: "Birth" },
  { value: "death", label: "Death" },
  { value: "fetalDeath", label: "Fetal Death" },
];

export const reviewStatuses = [
  { value: "forReview", label: "For Review" },
  { value: "reviewed", label: "Reviewed" },
];

export const releaseStatuses = [
  { value: "forRelease", label: "For Release" },
  { value: "released", label: "Released" },
  { value: "canceled", label: "Canceled" },
  { value: "voided", label: "Voided" },
];

export const vitalCertificateStatuses = [
  { value: "forReview", label: "For Review" },
  { value: "forRelease", label: "For Release" },
  { value: "released", label: "Released" },
  { value: "canceled", label: "Canceled" },
  { value: "voided", label: "Voided" },
];

export const paymentStatuses = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

export const relationshipOptions = [
  { value: "patient", label: "Patient Itself" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Relative" },
  { value: "guardian", label: "Guardian" },
  { value: "representative", label: "Representative" },
];

export const releaseRelationshipOptions = [
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Relative" },
  { value: "guardian", label: "Guardian" },
  { value: "representative", label: "Representative" },
  { value: "others", label: "Others" },
];

export function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || "N/A";
}

export function peso(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

export function getTrackingColumns(config, selectedType = "") {
  if (config.collection === "medicalDocumentRequests") {
    return config.columns.filter((column) => column.label !== "Document");
  }

  if (config.collection !== "vitalCertificateRequests") return config.columns;

  return config.columns.filter((column) => {
    if (column.label === "Type") return false;
    if (selectedType === "birth" && column.label === "Date of Death") return false;
    if (["death", "fetalDeath"].includes(selectedType) && column.label === "Birthday") return false;
    return true;
  });
}

function typeListLabel(row) {
  const types = Array.isArray(row.typeList) ? row.typeList : [];
  return types.length ? types.map((type) => optionLabel(certificateTypes, type)).join(", ") : "N/A";
}

function withRelationship(name, relationship) {
  const displayName = name || "N/A";
  const displayRelationship = optionLabel(relationshipOptions, relationship);
  return relationship ? `${displayName}\n${displayRelationship}` : displayName;
}

function reviewedLabel(row) {
  const reviewedAt = trackingDateTimeColumn("Reviewed", "reviewedAt", "").value(row);
  return `Reviewed: ${reviewedAt}\nBy: ${row.reviewedBy || "N/A"}`;
}

function patientCaseLabel(row) {
  return `${row.patientName || "N/A"}\n${row.caseNumber || "N/A"}`;
}

export const medicalDocumentConfig = {
  collection: "medicalDocumentRequests",
  titlePrefix: "Medical",
  titleAccent: "Documents",
  description: "Record and track patients who obtain medical certificates, medical abstracts, and certificates of confinement.",
  singleLabel: "Medical Document",
  pluralLabel: "Medical Documents",
  exportName: "medical-document-report",
  formHint: "Select a patient, choose the document, then release it later from the table.",
  searchPlaceholder: "Search patient, case number, document, receiver, or remarks",
  typeOptions: documentTypes,
  typeFilterKey: "documentType",
  typeHeadingSuffix: "Documents",
  defaultForm: {
    patientName: "",
    caseNumber: "",
    documentType: "medicalCertificate",
    releaseStatus: "forRelease",
    requestedAt: nowLocalKey(),
    releasedAt: "",
    receivedBy: "",
    remarks: "",
  },
  fields: [
    { key: "patientName", label: "Patient Name", type: "patient" },
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
  ],
  editFields: [
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
    { key: "releasedAt", label: "Released Date", type: "datetime-local" },
    { key: "receivedBy", label: "Received By", type: "text" },
    { key: "receiverRelationship", label: "Relationship", type: "select", options: relationshipOptions },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  columns: [
    { label: "Patient / Case No.", width: "w-[18%]", wrap: true, value: patientCaseLabel },
    { label: "Document", width: "w-[14%]", value: (row) => optionLabel(documentTypes, row.documentType) },
    { label: "Status", width: "w-[10%]", wrap: true, value: (row) => optionLabel(releaseStatuses, row.releaseStatus) },
    trackingDateRangeColumn("Requested / Released", "Requested", "requestedAt", "Released", "releasedAt", "w-[16%]"),
    { label: "Received By", width: "w-[12%]", wrap: true, value: (row) => row.receivedBy || "N/A" },
    { label: "Relationship", width: "w-[11%]", value: (row) => optionLabel(relationshipOptions, row.receiverRelationship) },
    { label: "Remarks", width: "w-[12%]", value: (row) => row.remarks || "" },
    { label: "Released By", width: "w-[12%]", wrap: true, value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: releaseStatuses,
  statusValue: (row) => row.releaseStatus || "forRelease",
  stats: (rows) => [
    { label: "Total Documents", value: rows.length },
    { label: "For Release", value: rows.filter((row) => !["released", "voided", "canceled"].includes(row.releaseStatus)).length },
    { label: "Released", value: rows.filter((row) => row.releaseStatus === "released").length },
  ],
  validate: (form) => {
    if (!form.patientName.trim()) return "Enter the patient name.";
    if (!form.documentType) return "Choose a document type.";
    if (!form.requestedAt) return "Enter the requested date.";
    return "";
  },
  toForm: (row) => ({
    patientName: row.patientName || "",
    caseNumber: row.caseNumber || "",
    documentType: row.documentType || "medicalCertificate",
    releaseStatus: row.releaseStatus || "forRelease",
    requestedAt: row.requestedAt || nowLocalKey(),
    releasedAt: row.releasedAt || "",
    receivedBy: row.receivedBy || "",
    receiverRelationship: row.receiverRelationship || "",
    remarks: row.remarks || "",
    releasedBy: row.releasedBy || "",
  }),
};

export const labResultConfig = {
  collection: "labResultRequests",
  titlePrefix: "Lab Results",
  titleAccent: "Requests",
  description: "Record and track patients who request and pay for medical lab result copies at PHP 2 per copy.",
  singleLabel: "Lab Result Request",
  pluralLabel: "Lab Result Requests",
  exportName: "lab-result-request-report",
  formHint: "Each copy costs PHP 2.00; total amount is computed automatically.",
  searchPlaceholder: "Search patient, case number, payment status, receiver, or remarks",
  defaultForm: {
    patientName: "",
    caseNumber: "",
    copyCount: 1,
    totalAmount: 2,
    paymentStatus: "unpaid",
    releaseStatus: "forRelease",
    requestedAt: nowLocalKey(),
    releasedAt: "",
    receivedBy: "",
    remarks: "",
  },
  normalizeForm: (form) => {
    const copyCount = Math.max(0, Number(form.copyCount) || 0);
    return { ...form, copyCount, totalAmount: copyCount * 2 };
  },
  formSummary: (form) => `${Number(form.copyCount || 0)} copy/copies x PHP 2.00 = ${peso(form.totalAmount)}`,
  fields: [
    { key: "patientName", label: "Patient Name", type: "patient" },
    { key: "copyCount", label: "Number of Copies", type: "number", min: 0 },
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
  ],
  editFields: [
    { key: "copyCount", label: "Number of Copies", type: "number", min: 0 },
    { key: "paymentStatus", label: "Payment", type: "select", options: paymentStatuses },
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
    { key: "releasedAt", label: "Released Date", type: "datetime-local" },
    { key: "receivedBy", label: "Received By", type: "text" },
    { key: "receiverRelationship", label: "Relationship", type: "select", options: relationshipOptions },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  columns: [
    { label: "Patient / Case No.", width: "w-[16%]", wrap: true, value: patientCaseLabel },
    { label: "Copies", width: "w-[8%]", value: (row) => row.copyCount || 0 },
    { label: "Amount", width: "w-[10%]", value: (row) => peso(row.totalAmount) },
    { label: "Payment", width: "w-[10%]", value: (row) => optionLabel(paymentStatuses, row.paymentStatus || "unpaid") },
    { label: "Release Status", width: "w-[10%]", wrap: true, value: (row) => optionLabel(releaseStatuses, row.releaseStatus) },
    trackingDateRangeColumn("Requested / Released", "Requested", "requestedAt", "Released", "releasedAt", "w-[15%]"),
    { label: "Received By", width: "w-[12%]", wrap: true, value: (row) => row.receivedBy || "N/A" },
    { label: "Relationship", width: "w-[11%]", value: (row) => optionLabel(relationshipOptions, row.receiverRelationship) },
    { label: "Remarks", width: "w-[12%]", value: (row) => row.remarks || "" },
    { label: "Released By", width: "w-[12%]", wrap: true, value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: [...paymentStatuses, ...releaseStatuses],
  statusValue: (row) => row.releaseStatus === "released" ? "released" : row.paymentStatus || "unpaid",
  matchesStatus: (row, status) => row.paymentStatus === status || row.releaseStatus === status,
  stats: (rows) => [
    { label: "Total Requests", value: rows.length },
    { label: "Total Copies", value: rows.reduce((sum, row) => sum + (Number(row.copyCount) || 0), 0) },
    { label: "Total Amount", value: peso(rows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0)) },
  ],
  validate: (form) => {
    if (!form.patientName.trim()) return "Enter the patient name.";
    if (!Number(form.copyCount)) return "Enter the number of lab result copies.";
    if (!form.requestedAt) return "Enter the requested date.";
    return "";
  },
  toForm: (row) => ({
    patientName: row.patientName || "",
    caseNumber: row.caseNumber || "",
    copyCount: row.copyCount || 1,
    totalAmount: row.totalAmount || 2,
    paymentStatus: row.paymentStatus || "unpaid",
    releaseStatus: row.releaseStatus || "forRelease",
    requestedAt: row.requestedAt || nowLocalKey(),
    releasedAt: row.releasedAt || "",
    receivedBy: row.receivedBy || "",
    receiverRelationship: row.receiverRelationship || "",
    remarks: row.remarks || "",
    releasedBy: row.releasedBy || "",
  }),
};

export const vitalCertificateConfig = {
  collection: "vitalCertificateRequests",
  titlePrefix: "Vital",
  titleAccent: "Certificates",
  description: "Record and track reviewing and releasing of birth, death, and fetal death certificates.",
  singleLabel: "Vital Certificate",
  pluralLabel: "Vital Certificates",
  exportName: "vital-certificate-report",
  formHint: "Choose one or more certificate types. New rows start for review and for release.",
  searchPlaceholder: "Search patient, certificate type, receiver, status, or remarks",
  typeOptions: certificateTypes,
  typeHeadingSuffix: "Certificates",
  defaultForm: {
    patientName: "",
    caseNumber: "",
    birthday: "",
    dateOfDeath: "",
    typeList: ["birth"],
    reviewStatus: "forReview",
    releaseStatus: "forRelease",
    requestedAt: nowLocalKey(),
    reviewedAt: "",
    releasedAt: "",
    receivedBy: "",
    remarks: "",
  },
  fields: [
    { key: "patientName", label: "Patient Name", type: "patient" },
    { key: "typeList", label: "Type", type: "multicheck", options: certificateTypes },
    { key: "birthday", label: "Birthday", type: "date", showWhen: (form) => (form.typeList || []).includes("birth") },
    { key: "dateOfDeath", label: "Date of Death", type: "date", showWhen: (form) => (form.typeList || []).some((type) => ["death", "fetalDeath"].includes(type)) },
    { key: "requestedAt", label: "Recorded Date", type: "datetime-local" },
  ],
  editFields: [
    { key: "birthday", label: "Birthday", type: "date", showWhen: (form) => (form.typeList || []).includes("birth") },
    { key: "dateOfDeath", label: "Date of Death", type: "date", showWhen: (form) => (form.typeList || []).some((type) => ["death", "fetalDeath"].includes(type)) },
    { key: "requestedAt", label: "Recorded Date", type: "datetime-local" },
    { key: "reviewedAt", label: "Reviewed Date", type: "datetime-local" },
    { key: "reviewedBy", label: "Reviewed By", type: "text" },
    { key: "receivedBy", label: "Received By", type: "text" },
    { key: "receiverRelationship", label: "Relationship", type: "select", options: relationshipOptions },
  ],
  columns: [
    { label: "Patient / Case No.", width: "w-[16%]", wrap: true, value: patientCaseLabel },
    { label: "Type", width: "w-[14%]", value: typeListLabel },
    { label: "Birthday", width: "w-[10%]", value: (row) => row.birthday || "N/A" },
    { label: "Date of Death", width: "w-[10%]", value: (row) => row.dateOfDeath || "N/A" },
    {
      label: "Review Status",
      width: "w-[12%]",
      value: (row) => optionLabel(reviewStatuses, row.reviewStatus || "forReview"),
    },
    trackingDateRangeColumn("Recorded / Released", "Recorded", "requestedAt", "Released", "releasedAt", "w-[14%]"),
    { label: "Reviewed / By", width: "w-[14%]", wrap: true, value: reviewedLabel },
    { label: "Received By", width: "w-[13%]", wrap: true, value: (row) => withRelationship(row.receivedBy, row.receiverRelationship) },
    { label: "Release Status", width: "w-[12%]", value: (row) => optionLabel(releaseStatuses, row.releaseStatus || "forRelease") },
    { label: "Released By", width: "w-[12%]", value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: vitalCertificateStatuses,
  statusValue: (row) => row.releaseStatus === "released" ? "released" : row.reviewStatus || "forReview",
  matchesStatus: (row, status) => {
    if (status === "forReview") return !["voided", "canceled"].includes(row.releaseStatus) && row.reviewStatus !== "reviewed";
    if (status === "forRelease") return row.reviewStatus === "reviewed" && !["released", "voided", "canceled"].includes(row.releaseStatus);
    return row.releaseStatus === status;
  },
  stats: (rows) => [
    { label: "Total Certificates", value: rows.length },
    { label: "For Review", value: rows.filter((row) => !["voided", "canceled"].includes(row.releaseStatus) && row.reviewStatus !== "reviewed").length },
    { label: "For Release", value: rows.filter((row) => row.reviewStatus === "reviewed" && !["released", "voided", "canceled"].includes(row.releaseStatus)).length },
  ],
  validate: (form) => {
    if (!form.patientName.trim()) return "Enter the patient name.";
    if (!Array.isArray(form.typeList) || form.typeList.length === 0) return "Choose at least one certificate type.";
    if ((form.typeList || []).includes("birth") && !form.birthday) return "Enter the birthday for birth certificate requests.";
    if ((form.typeList || []).some((type) => ["death", "fetalDeath"].includes(type)) && !form.dateOfDeath) return "Enter the date of death for death or fetal death certificate requests.";
    if (!form.requestedAt) return "Enter the recorded date.";
    return "";
  },
  toForm: (row) => ({
    patientName: row.patientName || "",
    caseNumber: row.caseNumber || "",
    birthday: row.birthday || "",
    dateOfDeath: row.dateOfDeath || "",
    typeList: Array.isArray(row.typeList) && row.typeList.length ? row.typeList : ["birth"],
    reviewStatus: row.reviewStatus || "forReview",
    releaseStatus: row.releaseStatus || "forRelease",
    requestedAt: row.requestedAt || nowLocalKey(),
    reviewedAt: row.reviewedAt || "",
    releasedAt: row.releasedAt || "",
    reviewedBy: row.reviewedBy || "",
    receivedBy: row.receivedBy || "",
    receiverRelationship: row.receiverRelationship || "",
    remarks: row.remarks || "",
    releasedBy: row.releasedBy || "",
  }),
};

export const trackingReportConfigs = [
  medicalDocumentConfig,
  labResultConfig,
  vitalCertificateConfig,
];
