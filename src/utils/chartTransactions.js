// Builds the report-log payload used when a borrowed chart is returned.
export function buildReturnedChartLog({ chart, caseNumber, returner, returnedAt, remarks = "Chart returned" }) {
  return {
    action: "returned",
    patientName: chart.patientName,
    caseNumber,
    borrowedBy: chart.borrower || "N/A",
    returnedBy: returner,
    department: chart.department || "N/A",
    timestamp: chart.borrowedAt || returnedAt,
    borrowedAt: chart.borrowedAt || returnedAt,
    returnedAt,
    dueDate: "",
    remarks,
  };
}

// Builds the chart document update that marks a returned chart as available.
export function buildReturnedChartUpdate({ chart, returner, returnedAt }) {
  return {
    status: "available",
    borrower: "",
    department: "",
    borrowedAt: "",
    dueDate: "",
    activeLogId: "",
    history: [
      {
        action: "checkin",
        date: returnedAt,
        borrower: chart.borrower || "N/A",
        returnedBy: returner,
        department: chart.department || "N/A",
      },
      ...(chart.history || []),
    ],
  };
}
