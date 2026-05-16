import React from "react";
import TrackingPage from "./TrackingPage";
import { labResultConfig } from "../utils/trackingConfigs";

export default function LabResults() {
  return <TrackingPage config={labResultConfig} />;
}
