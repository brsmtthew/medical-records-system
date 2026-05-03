import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNotification } from "./notificationLog.js";

test("normalizeNotification keeps audit fields for patient actions", () => {
  const notification = normalizeNotification({
    id: "toast-1",
    type: "success",
    title: "Checkout Complete",
    message: "CASE-001 was checked out successfully.",
    createdAt: "2026-05-02T08:00:00.000Z",
    patientName: "JUAN DELA CRUZ",
    caseNumber: "CASE-001",
    action: "Chart Borrowed",
    userName: "MARIA RECORDS",
    userEmail: "maria@example.com",
    userId: "user-1",
  });

  assert.equal(notification.patientName, "JUAN DELA CRUZ");
  assert.equal(notification.caseNumber, "CASE-001");
  assert.equal(notification.action, "Chart Borrowed");
  assert.equal(notification.userName, "MARIA RECORDS");
  assert.equal(notification.userEmail, "maria@example.com");
  assert.equal(notification.userId, "user-1");
  assert.equal(notification.createdAt, "2026-05-02T08:00:00.000Z");
});

test("normalizeNotification falls back safely for general notifications", () => {
  const notification = normalizeNotification({
    title: "Settings Updated",
    message: "Settings saved.",
  });

  assert.equal(notification.type, "info");
  assert.equal(notification.patientName, "");
  assert.equal(notification.caseNumber, "");
  assert.equal(notification.action, "Settings Updated");
  assert.equal(notification.userName, "");
  assert.equal(notification.userEmail, "");
  assert.equal(notification.userId, "");
  assert.ok(notification.id);
  assert.ok(notification.createdAt);
});
