import React from "react";
import TrackingPage from "./TrackingPage";
import { medicalDocumentConfig } from "../utils/trackingConfigs";

export default function MedicalDocuments() {
  return <TrackingPage config={medicalDocumentConfig} />;
}
