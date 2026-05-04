import test from "node:test";
import assert from "node:assert/strict";
import { buildReturnedChartLog, buildReturnedChartUpdate } from "./chartTransactions.js";

test("buildReturnedChartLog preserves return details without creating a due date", () => {
  const log = buildReturnedChartLog({
    chart: {
      patientName: "JUAN DELA CRUZ",
      borrower: "NURSE A",
      department: "Emergency Room",
      borrowedAt: "2026-05-01T08:00:00.000Z",
      dueDate: "2026-05-04",
    },
    caseNumber: "CASE-001",
    returner: "RECORDS STAFF",
    returnedAt: "2026-05-02T10:30:00.000Z",
  });

  assert.deepEqual(log, {
    action: "returned",
    patientName: "JUAN DELA CRUZ",
    caseNumber: "CASE-001",
    borrowedBy: "NURSE A",
    returnedBy: "RECORDS STAFF",
    department: "Emergency Room",
    timestamp: "2026-05-01T08:00:00.000Z",
    borrowedAt: "2026-05-01T08:00:00.000Z",
    returnedAt: "2026-05-02T10:30:00.000Z",
    dueDate: "",
    remarks: "Chart returned",
  });
});

test("buildReturnedChartLog uses safe fallback values for incomplete chart data", () => {
  const log = buildReturnedChartLog({
    chart: {
      patientName: "MARIA SANTOS",
    },
    caseNumber: "CASE-002",
    returner: "RECORDS STAFF",
    returnedAt: "2026-05-02T11:00:00.000Z",
    remarks: "Recovered return log",
  });

  assert.equal(log.borrowedBy, "N/A");
  assert.equal(log.department, "N/A");
  assert.equal(log.timestamp, "2026-05-02T11:00:00.000Z");
  assert.equal(log.borrowedAt, "2026-05-02T11:00:00.000Z");
  assert.equal(log.remarks, "Recovered return log");
});

test("buildReturnedChartLog uses the current case number after a borrowed chart is renamed", () => {
  const log = buildReturnedChartLog({
    chart: {
      patientName: "UPDATED PATIENT",
      borrower: "NURSE B",
      department: "Surgery",
      borrowedAt: "2026-05-01T09:00:00.000Z",
      dueDate: "2026-05-04",
    },
    caseNumber: "NEW-CASE-002",
    returner: "RECORDS STAFF",
    returnedAt: "2026-05-02T12:00:00.000Z",
  });

  assert.equal(log.caseNumber, "NEW-CASE-002");
  assert.equal(log.patientName, "UPDATED PATIENT");
  assert.equal(log.borrowedBy, "NURSE B");
  assert.equal(log.department, "Surgery");
});

test("buildReturnedChartUpdate clears borrowed state and preserves previous history", () => {
  const update = buildReturnedChartUpdate({
    chart: {
      borrower: "NURSE C",
      department: "Laboratory",
      history: [
        {
          action: "checkout",
          borrower: "NURSE C",
          department: "Laboratory",
          date: "2026-05-01T08:00:00.000Z",
        },
      ],
    },
    returner: "RECORDS STAFF",
    returnedAt: "2026-05-02T13:00:00.000Z",
  });

  assert.equal(update.status, "available");
  assert.equal(update.borrower, "");
  assert.equal(update.department, "");
  assert.equal(update.borrowedAt, "");
  assert.equal(update.dueDate, "");
  assert.equal(update.activeLogId, "");
  assert.deepEqual(update.history[0], {
    action: "checkin",
    date: "2026-05-02T13:00:00.000Z",
    borrower: "NURSE C",
    returnedBy: "RECORDS STAFF",
    department: "Laboratory",
  });
  assert.equal(update.history[1].action, "checkout");
});
