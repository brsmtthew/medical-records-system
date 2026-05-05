import test from "node:test";
import assert from "node:assert/strict";
import { latestRecordTime, recordTimeValue, sortNewestFirst } from "./recordSorting.js";

test("recordTimeValue supports Firestore timestamps, dates, and ISO strings", () => {
  assert.equal(recordTimeValue({ toMillis: () => 2000 }), 2000);
  assert.equal(recordTimeValue({ seconds: 3 }), 3000);
  assert.equal(recordTimeValue(new Date("2026-05-02T00:00:00.000Z")), Date.parse("2026-05-02T00:00:00.000Z"));
  assert.equal(recordTimeValue("2026-05-03T00:00:00.000Z"), Date.parse("2026-05-03T00:00:00.000Z"));
  assert.equal(recordTimeValue("not-a-date"), 0);
});

test("latestRecordTime prefers the newest available record activity", () => {
  const row = {
    createdAt: "2026-05-01T00:00:00.000Z",
    timestamp: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z",
  };

  assert.equal(latestRecordTime(row), Date.parse("2026-05-03T00:00:00.000Z"));
});

test("sortNewestFirst places updated charts above older charts", () => {
  const rows = [
    { caseNumber: "CASE-OLD", createdAt: "2026-05-01T00:00:00.000Z" },
    {
      caseNumber: "CASE-UPDATED",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-05-04T00:00:00.000Z",
    },
    { caseNumber: "CASE-NEW", createdAt: "2026-05-03T00:00:00.000Z" },
  ];

  assert.deepEqual(sortNewestFirst(rows).map((row) => row.caseNumber), [
    "CASE-UPDATED",
    "CASE-NEW",
    "CASE-OLD",
  ]);
});

test("sortNewestFirst handles edited report rows as latest records", () => {
  const rows = [
    { id: "borrowed", timestamp: "2026-05-01T08:00:00.000Z" },
    {
      id: "edited",
      timestamp: "2026-04-30T08:00:00.000Z",
      updatedAt: "2026-05-02T08:00:00.000Z",
    },
  ];

  assert.equal(sortNewestFirst(rows)[0].id, "edited");
});
