import React from "react";
import TrackingPage from "./TrackingPage";
import { vitalCertificateConfig } from "../utils/trackingConfigs";

export default function VitalCertificates() {
  return <TrackingPage config={vitalCertificateConfig} />;
}
