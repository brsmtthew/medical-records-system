import React from "react";
import TrackingPage from "../../tracking/pages/TrackingPage";
import { labResultConfig } from "@features/tracking/utils/trackingConfigs";

export default function LabResults() {
  return <TrackingPage config={labResultConfig} />;
}
