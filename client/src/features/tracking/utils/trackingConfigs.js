import {
  formatTrackingDateOnly,
  formatTrackingDateTimeWithTime,
  nowLocalKey,
  trackingDateRangeColumn,
} from "./trackingPageHelpers";

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
];

// Kept as a separate export for callers; voided is fully retired so this now
// mirrors releaseStatuses.
export const documentReleaseStatuses = releaseStatuses;

export const vitalCertificateStatuses = [
  { value: "forReview", label: "For Review" },
  { value: "forRelease", label: "For Release" },
  { value: "released", label: "Released" },
  { value: "canceled", label: "Canceled" },
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

export const trackingRelationshipOptions = [
  { value: "patient", label: "Patient Itself" },
  ...releaseRelationshipOptions,
];

export function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || "N/A";
}

export function statusTextClass(status) {
  const classes = {
    active: "mrs-status-text-success",
    accepted: "mrs-status-text-reviewed",
    borrowed: "mrs-status-text-borrowed",
    canceled: "mrs-status-text-warning",
    for_pickup: "mrs-status-text-success",
    for_return: "mrs-status-text-warning",
    forRelease: "mrs-status-text-borrowed",
    forReview: "mrs-status-text-borrowed",
    paid: "mrs-status-text-success",
    pending: "mrs-status-text-warning",
    preparing: "mrs-status-text-borrowed",
    ready: "mrs-status-text-success",
    received: "mrs-status-text-reviewed",
    inReview: "mrs-status-text-reviewed",
    inreview: "mrs-status-text-reviewed",
    released: "mrs-status-text-success",
    returned: "mrs-status-text-success",
    returnReceived: "mrs-status-text-reviewed",
    returnreceived: "mrs-status-text-reviewed",
    completed: "mrs-status-text-success",
    reviewing: "mrs-status-text-reviewed",
    reviewed: "mrs-status-text-reviewed",
    unpaid: "mrs-status-text-danger",
    voided: "mrs-status-text-voided",
    deleted: "mrs-status-text-danger",
  };

  return classes[status] || "mrs-status-text-neutral";
}

export function statusBadgeClass(status) {
  const classes = {
    active: "mrs-status-success",
    accepted: "mrs-status-info",
    borrowed: "mrs-status-borrowed",
    canceled: "mrs-status-warning",
    for_pickup: "mrs-status-success",
    for_return: "mrs-status-warning",
    forRelease: "mrs-status-info",
    forReview: "mrs-status-info",
    paid: "mrs-status-success",
    pending: "mrs-status-warning",
    preparing: "mrs-status-info",
    ready: "mrs-status-success",
    received: "mrs-status-info",
    inReview: "mrs-status-info",
    inreview: "mrs-status-info",
    released: "mrs-status-success",
    returned: "mrs-status-success",
    returnReceived: "mrs-status-info",
    returnreceived: "mrs-status-info",
    completed: "mrs-status-success",
    reviewing: "mrs-status-info",
    reviewed: "mrs-status-info",
    unpaid: "mrs-status-danger",
    voided: "mrs-status-voided",
    deleted: "mrs-status-danger",
  };

  return classes[status] || "mrs-status-neutral";
}

export function peso(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

export function getTrackingColumns(config, selectedType = "") {
  if (config.collection === "medicalDocumentRequests") {
    return config.columns.filter((column) => column.label !== "Document Type");
  }

  if (config.collection !== "vitalCertificateRequests") return config.columns;

  return config.columns
    .filter((column) => column.label !== "Certificate Type")
    .map((column) => (
      column.label === "Civil Dates"
        ? { ...column, value: (row) => civilDateLabel(row, selectedType) }
        : column
    ));
}

function typeListLabel(row, options = certificateTypes) {
  const types = Array.isArray(row.typeList) ? row.typeList : [];
  return types.length ? types.map((type) => optionLabel(options, type)).join(", ") : "N/A";
}

function medicalDocumentTypeLabel(row) {
  const label = typeListLabel(row, documentTypes);
  return label === "N/A" ? optionLabel(documentTypes, row.documentType) : label;
}

function withRelationship(name, relationship) {
  const displayName = name || "N/A";
  const displayRelationship = optionLabel(trackingRelationshipOptions, relationship);
  return relationship ? `${displayName}\n${displayRelationship}` : displayName;
}

function reviewedLabel(row) {
  const reviewedAt = formatTrackingDateTimeWithTime(row.reviewedAt);
  const reviewer = row.reviewedBy || "N/A";
  const relationship = row.reviewRelationship
    ? ` (${optionLabel(releaseRelationshipOptions, row.reviewRelationship)})`
    : "";
  return `Reviewed: ${reviewedAt}\n${reviewer}${relationship}`;
}

function labCopiesAmountLabel(row) {
  return `Copies: ${row.copyCount || 0}\nAmount: ${peso(row.totalAmount)}`;
}

function civilDateLabel(row, selectedType = "") {
  const rowTypes = Array.isArray(row.typeList) ? row.typeList : [];
  const types = selectedType ? [selectedType] : rowTypes;
  const includesBirth = types.includes("birth") || (!types.length && row.birthday);
  const includesDeath = types.some((type) => ["death", "fetalDeath"].includes(type))
    || (!types.length && row.dateOfDeath);
  const lines = [];
  if (includesBirth && row.birthday) lines.push(`Birthday: ${formatTrackingDateOnly(row.birthday)}`);
  if (includesDeath && row.dateOfDeath) lines.push(`Death: ${formatTrackingDateOnly(row.dateOfDeath)}`);
  return lines.length ? lines.join("\n") : "N/A";
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
    typeList: ["medicalCertificate"],
    releaseStatus: "forRelease",
    requestedAt: nowLocalKey(),
    releasedAt: "",
    receivedBy: "",
    remarks: "",
  },
  fields: [
    { key: "patientName", label: "Patient Name", type: "patient" },
    { key: "typeList", label: "Document Type", type: "multicheck", options: documentTypes },
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
  ],
  editFields: [
    { key: "requestedAt", label: "Requested Date", type: "datetime-local" },
    { key: "releasedAt", label: "Released Date", type: "datetime-local" },
    { key: "receivedBy", label: "Received By", type: "text" },
    { key: "receiverRelationship", label: "Relationship", type: "select", options: trackingRelationshipOptions },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  columns: [
    { label: "Patient / Case", width: "w-[18%]", wrap: true, patientCase: true, value: patientCaseLabel },
    { label: "Document Type", width: "w-[14%]", wrap: true, compact: true, indicator: "info", value: medicalDocumentTypeLabel },
    { label: "Release", width: "w-[10%]", wrap: true, statusKey: "releaseStatus", statusFallback: "forRelease", value: (row) => optionLabel(releaseStatuses, row.releaseStatus) },
    trackingDateRangeColumn("Request Dates", "Requested", "requestedAt", "Released", "releasedAt", "w-[18%]"),
    { label: "Receiver", width: "w-[15%]", wrap: true, compact: true, value: (row) => withRelationship(row.receivedBy, row.receiverRelationship) },
    { label: "Remarks", width: "w-[12%]", wrap: true, compact: true, value: (row) => row.remarks || "N/A" },
    { label: "Released Staff", width: "w-[13%]", wrap: true, compact: true, value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: documentReleaseStatuses,
  statusValue: (row) => row.releaseStatus || "forRelease",
  stats: (rows) => [
    { label: "Total Documents", value: rows.length },
    { label: "For Release", value: rows.filter((row) => !["released", "voided", "canceled"].includes(row.releaseStatus)).length },
    { label: "Released", value: rows.filter((row) => row.releaseStatus === "released").length },
  ],
  validate: (form) => {
    if (!form.patientName.trim()) return "Enter the patient name.";
    if (!Array.isArray(form.typeList) || form.typeList.length === 0) return "Choose at least one document type.";
    if (!form.requestedAt) return "Enter the requested date.";
    return "";
  },
  toForm: (row) => ({
    patientName: row.patientName || "",
    caseNumber: row.caseNumber || "",
    documentType: row.documentType || "medicalCertificate",
    typeList: Array.isArray(row.typeList) && row.typeList.length
      ? row.typeList
      : [row.documentType || "medicalCertificate"],
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
  titlePrefix: "Laboratory",
  titleAccent: "Results",
  description: "Record and track patients who request and pay for medical laboratory result copies at PHP 2 per copy.",
  singleLabel: "Laboratory Result",
  pluralLabel: "Laboratory Results",
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
    { key: "receiverRelationship", label: "Relationship", type: "select", options: trackingRelationshipOptions },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  columns: [
    { label: "Patient / Case", width: "w-[16%]", wrap: true, patientCase: true, value: patientCaseLabel },
    { label: "Copies / Amount", width: "w-[13%]", wrap: true, compact: true, value: labCopiesAmountLabel },
    { label: "Payment", width: "w-[10%]", statusKey: "paymentStatus", statusFallback: "unpaid", value: (row) => optionLabel(paymentStatuses, row.paymentStatus || "unpaid") },
    { label: "Release", width: "w-[10%]", wrap: true, statusKey: "releaseStatus", statusFallback: "forRelease", value: (row) => optionLabel(releaseStatuses, row.releaseStatus) },
    trackingDateRangeColumn("Request Dates", "Requested", "requestedAt", "Released", "releasedAt", "w-[17%]"),
    { label: "Receiver", width: "w-[14%]", wrap: true, compact: true, value: (row) => withRelationship(row.receivedBy, row.receiverRelationship) },
    { label: "Remarks", width: "w-[10%]", wrap: true, compact: true, value: (row) => row.remarks || "N/A" },
    { label: "Released Staff", width: "w-[10%]", wrap: true, compact: true, value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: [...paymentStatuses, ...documentReleaseStatuses],
  statusValue: (row) => row.releaseStatus === "released" ? "released" : row.paymentStatus || "unpaid",
  matchesStatus: (row, status) => row.paymentStatus === status || row.releaseStatus === status,
  stats: (rows) => [
    { label: "Total Requests", value: rows.length },
    { label: "Total Copies", value: rows.reduce((sum, row) => sum + (Number(row.copyCount) || 0), 0) },
    { label: "Total Amount", value: peso(rows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0)) },
  ],
  validate: (form) => {
    if (!form.patientName.trim()) return "Enter the patient name.";
    if (!Number(form.copyCount)) return "Enter the number of laboratory result copies.";
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
  titlePrefix: "Civil",
  titleAccent: "Documents",
  description: "Record and track reviewing and releasing of birth, death, and fetal death civil documents.",
  singleLabel: "Civil Document",
  pluralLabel: "Civil Documents",
  exportName: "civil-document-report",
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
    reviewRelationship: "",
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
    { key: "reviewRelationship", label: "Review Relationship", type: "select", options: releaseRelationshipOptions },
    { key: "receivedBy", label: "Received By", type: "text" },
    { key: "receiverRelationship", label: "Relationship", type: "select", options: trackingRelationshipOptions },
  ],
  columns: [
    { label: "Patient / Case", width: "w-[16%]", wrap: true, patientCase: true, value: patientCaseLabel },
    { label: "Certificate Type", width: "w-[13%]", wrap: true, compact: true, indicator: "info", value: typeListLabel },
    { label: "Civil Dates", width: "w-[12%]", wrap: true, compact: true, dateLines: true, value: civilDateLabel },
    {
      label: "Review",
      width: "w-[12%]",
      statusKey: "reviewStatus",
      statusFallback: "forReview",
      value: (row) => optionLabel(reviewStatuses, row.reviewStatus || "forReview"),
    },
    trackingDateRangeColumn("Process Dates", "Recorded", "requestedAt", "Released", "releasedAt", "w-[15%]"),
    { label: "Reviewer", width: "w-[14%]", wrap: true, compact: true, value: reviewedLabel },
    { label: "Receiver", width: "w-[12%]", wrap: true, compact: true, value: (row) => withRelationship(row.receivedBy, row.receiverRelationship) },
    { label: "Release", width: "w-[10%]", statusKey: "releaseStatus", statusFallback: "forRelease", value: (row) => optionLabel(releaseStatuses, row.releaseStatus || "forRelease") },
    { label: "Released Staff", width: "w-[11%]", wrap: true, compact: true, value: (row) => row.releasedBy || "N/A" },
  ],
  statusOptions: vitalCertificateStatuses.filter((status) => status.value !== "voided"),
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
    reviewRelationship: row.reviewRelationship || "",
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
