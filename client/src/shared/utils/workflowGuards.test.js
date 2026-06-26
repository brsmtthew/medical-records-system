import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCanReleaseTrackingRow,
  assertCanReviewTrackingRow,
  assertChartRequestTransition,
  assertEditableTrackingRow,
} from "./workflowGuards.js";

test("assertChartRequestTransition allows expected chart request flow", () => {
  assert.equal(assertChartRequestTransition("pending", "preparing"), "preparing");
  assert.equal(assertChartRequestTransition("reviewing", "preparing"), "preparing");
  assert.equal(assertChartRequestTransition("preparing", "ready"), "ready");
  assert.equal(assertChartRequestTransition("ready", "received"), "received");
  assert.equal(assertChartRequestTransition("ready", "inReview"), "inReview");
  assert.equal(assertChartRequestTransition("received", "inReview"), "inReview");
  assert.equal(assertChartRequestTransition("inReview", "returned"), "returned");
  assert.equal(assertChartRequestTransition("received", "returned"), "returned");
  assert.equal(assertChartRequestTransition("returned", "returnReceived"), "returnReceived");
  assert.equal(assertChartRequestTransition("returnReceived", "completed"), "completed");
  assert.equal(assertChartRequestTransition("pending", "canceled"), "canceled");
  assert.equal(assertChartRequestTransition("reviewing", "canceled"), "canceled");
  assert.equal(assertChartRequestTransition("preparing", "canceled"), "canceled");
});

test("assertChartRequestTransition blocks completed or backward request changes", () => {
  assert.throws(
    () => assertChartRequestTransition("completed", "ready"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("ready", "preparing"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("ready", "completed"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("pending", "ready"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("ready", "canceled"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("received", "completed"),
    /Invalid chart request transition/,
  );
});

test("assertEditableTrackingRow blocks terminal tracking records", () => {
  assert.doesNotThrow(() => assertEditableTrackingRow({ releaseStatus: "forRelease" }));
  assert.throws(
    () => assertEditableTrackingRow({ releaseStatus: "released" }),
    /already released/,
  );
  assert.throws(
    () => assertEditableTrackingRow({ releaseStatus: "voided" }),
    /already voided/,
  );
});

test("assertCanReviewTrackingRow prevents duplicate review", () => {
  assert.doesNotThrow(() => assertCanReviewTrackingRow({ reviewStatus: "forReview", releaseStatus: "forRelease" }));
  assert.throws(
    () => assertCanReviewTrackingRow({ reviewStatus: "reviewed", releaseStatus: "forRelease" }),
    /already been reviewed/,
  );
});

test("assertCanReleaseTrackingRow enforces medical document release prerequisites", () => {
  assert.doesNotThrow(() => assertCanReleaseTrackingRow("medicalDocumentRequests", { releaseStatus: "forRelease" }));
  assert.throws(
    () => assertCanReleaseTrackingRow("medicalDocumentRequests", { releaseStatus: "canceled" }),
    /already canceled/,
  );
});

test("assertCanReleaseTrackingRow requires payment before lab release", () => {
  assert.doesNotThrow(() => assertCanReleaseTrackingRow("labResultRequests", {
    paymentStatus: "paid",
    releaseStatus: "forRelease",
  }));
  assert.throws(
    () => assertCanReleaseTrackingRow("labResultRequests", {
      paymentStatus: "unpaid",
      releaseStatus: "forRelease",
    }),
    /marked paid/,
  );
});

test("assertCanReleaseTrackingRow requires civil document review before release", () => {
  assert.doesNotThrow(() => assertCanReleaseTrackingRow("vitalCertificateRequests", {
    reviewStatus: "reviewed",
    releaseStatus: "forRelease",
  }));
  assert.throws(
    () => assertCanReleaseTrackingRow("vitalCertificateRequests", {
      reviewStatus: "forReview",
      releaseStatus: "forRelease",
    }),
    /reviewed before release/,
  );
});
