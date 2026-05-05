import React from "react";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  isOpen,
  message,
  onCancel,
  onConfirm,
  title = "Confirm Action",
  variant = "danger",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} className="max-w-sm text-center">
      {message && <p className="mt-3 text-sm font-semibold text-slate-500">{message}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
