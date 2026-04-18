import React, { useState } from "react";

export default function PatientEditModal({ patient, onSave, onClose }) {
  const [form, setForm] = useState(patient);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96 space-y-2">
        <h2 className="font-bold">Edit Patient</h2>

        <input
          className="border p-2 w-full"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          className="border p-2 w-full"
          value={form.caseNumber}
          onChange={(e) =>
            setForm({ ...form, caseNumber: e.target.value })
          }
        />

        <button
          onClick={() => onSave(form)}
          className="bg-green-600 text-white px-4 py-2 w-full"
        >
          Save
        </button>

        <button onClick={onClose} className="text-red-500 w-full">
          Cancel
        </button>
      </div>
    </div>
  );
}