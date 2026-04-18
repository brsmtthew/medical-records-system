import React from "react";

export default function ConfirmDeleteModal({
  patient,
  onConfirm,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-80 text-center">
        <p className="mb-4">
          Delete <b>{patient.name}</b>?
        </p>

        <div className="flex gap-2 justify-center">
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2"
          >
            Delete
          </button>

          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}