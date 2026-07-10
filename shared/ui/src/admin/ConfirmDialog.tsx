import { useState } from "react";
import { Modal } from "../primitives/Modal.js";
import { Button, type ButtonVariant } from "../primitives/Button.js";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmation gate for destructive admin actions (deactivate user,
 * transfer ownership, delete data), per
 * frameworks/07-admin-panel-framework.md's "destructive actions confirm"
 * rule. Disables both buttons while an async onConfirm is in flight so a
 * double-click can't fire the mutation twice.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} description={description}>
      <div className="fos-confirm-dialog-actions">
        <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={handleConfirm} isLoading={isConfirming}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
