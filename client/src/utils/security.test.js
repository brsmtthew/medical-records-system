import test from "node:test";
import assert from "node:assert/strict";
import { isStrongPassword, normalizeEmail, sanitizeRecordPayload, sanitizeText } from "./security.js";

test("sanitizeText removes control characters and normalizes spacing", () => {
  assert.equal(sanitizeText("  John\u0000   Doe  "), "John Doe");
});

test("sanitizeText can uppercase and clip text", () => {
  assert.equal(sanitizeText("medical records", { uppercase: true, maxLength: 7 }), "MEDICAL");
});

test("normalizeEmail lowercases and trims email values", () => {
  assert.equal(normalizeEmail(" STAFF@Hospital.COM "), "staff@hospital.com");
});

test("isStrongPassword requires length, mixed case, and a number", () => {
  assert.equal(isStrongPassword("password"), false);
  assert.equal(isStrongPassword("Password1"), true);
});

test("sanitizeRecordPayload sanitizes only string fields", () => {
  assert.deepEqual(
    sanitizeRecordPayload(
      { name: "  jane   doe ", count: 2 },
      { name: { uppercase: true } },
    ),
    { name: "JANE DOE", count: 2 },
  );
});
