"use client";

import { Modal } from "../primitives/Modal.js";
import { Button } from "../primitives/Button.js";

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** What specifically was hit — "AI credits", "SaaS apps tracked", etc. — shown verbatim, not a generic message. */
  limitLabel: string;
  currentPlanName: string;
  suggestedPlanName: string;
  onUpgrade: () => void;
  isUpgrading?: boolean;
}

/**
 * Triggered client-side whenever a `withinLimit`/`can` check fails (a 403
 * from any product's API), per COMMERCIAL_FREEZE.md §Section 3's dependency
 * map. One shared modal so every product's "you hit a limit" moment looks
 * and behaves identically instead of 12 bespoke alert/toast treatments.
 */
export function UpgradeModal({
  isOpen,
  onClose,
  limitLabel,
  currentPlanName,
  suggestedPlanName,
  onUpgrade,
  isUpgrading = false,
}: UpgradeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`You've reached your ${currentPlanName} plan's ${limitLabel} limit`}
      description={`Upgrade to ${suggestedPlanName} to keep going.`}
    >
      <div className="fos-upgrade-modal-actions">
        <Button variant="outline" onClick={onClose}>
          Not now
        </Button>
        <Button onClick={onUpgrade} isLoading={isUpgrading}>
          Upgrade to {suggestedPlanName}
        </Button>
      </div>
    </Modal>
  );
}
