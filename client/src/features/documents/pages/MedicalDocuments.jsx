import React from "react";
import TrackingPage from "../../tracking/pages/TrackingPage";
import { medicalDocumentConfig } from "@features/tracking/utils/trackingConfigs";

export default function MedicalDocuments() {
  return <TrackingPage config={medicalDocumentConfig} />;
}
