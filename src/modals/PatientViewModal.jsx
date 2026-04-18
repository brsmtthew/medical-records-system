import React from "react";

export default function PatientViewModal({ patient, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96">
        <h2 className="font-bold text-lg mb-3">Patient Info</h2>

        <p><b>Name:</b> {patient.name}</p>
        <p><b>Case:</b> {patient.caseNumber}</p>
        <p><b>Type:</b> {patient.type}</p>

        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white px-4 py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}