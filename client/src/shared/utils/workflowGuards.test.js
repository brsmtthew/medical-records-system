import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCanReleaseTrackingRow,
  assertCanReviewTrackingRow,
  assertChartRequestTransition,
  assertEditableTrackingRow,
} from "./workflowGuards.js";

test("assertChartRequestTransition allows expected chart request flow", () => {
<<<<<<< HEAD
  assert.equal(assertChartRequestTransition("pending", "accepted"), "accepted");
  assert.equal(assertChartRequestTransition("accepted", "preparing"), "preparing");
  assert.equal(assertChartRequestTransition("preparing", "for_pickup"), "for_pickup");
  assert.equal(assertChartRequestTransition("for_pickup", "received"), "received");
  assert.equal(assertChartRequestTransition("received", "for_return"), "for_return");
  assert.equal(assertChartRequestTransition("for_return", "returned"), "returned");
=======
  assert.equal(assertChartRequestTransition("pending", "reviewing"), "reviewing");
  assert.equal(assertChartRequestTransition("reviewing", "preparing"), "preparing");
  assert.equal(assertChartRequestTransition("preparing", "ready"), "ready");
  assert.equal(assertChartRequestTransition("ready", "received"), "received");
  assert.equal(assertChartRequestTransition("received", "returned"), "returned");
  assert.equal(assertChartRequestTransition("returned", "returnReceived"), "returnReceived");
  assert.equal(assertChartRequestTransition("returnReceived", "completed"), "completed");
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
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
    () => assertChartRequestTransition("for_pickup", "preparing"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("for_pickup", "returned"),
    /Invalid chart request transition/,
  );
  assert.throws(
<<<<<<< HEAD
    () => assertChartRequestTransition("pending", "for_pickup"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("received", "returned"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("received", "canceled"),
=======
    () => assertChartRequestTransition("pending", "preparing"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("ready", "canceled"),
    /Invalid chart request transition/,
  );
  assert.throws(
    () => assertChartRequestTransition("received", "completed"),
>>>>>>> 165db78b63a3abe387c16703735aacea8b54ab82
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
