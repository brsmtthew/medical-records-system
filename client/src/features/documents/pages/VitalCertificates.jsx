import React from "react";
import TrackingPage from "../../tracking/pages/TrackingPage";
import { vitalCertificateConfig } from "@features/tracking/utils/trackingConfigs";

export default function VitalCertificates() {
  return <TrackingPage config={vitalCertificateConfig} />;
}
