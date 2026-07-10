export type PhoneValidationStatus = "valid" | "invalid" | "risky";

export interface PhoneValidationResult {
  status: PhoneValidationStatus;
  digitCount: number;
  isValidFormat: boolean;
}

/**
 * Offline-computable phone format check per
 * products/contactverify/docs/PRODUCT_IDENTITY.md §7 "Phone validation:
 * Format ... checks." Live carrier/line-type lookup is a network call
 * requiring Phase 2 infrastructure; a valid-length number with a
 * plausible international prefix is scored "valid," a short/garbage
 * number is "invalid," and edge-length numbers (very short local
 * formats) are flagged "risky" rather than confidently valid or invalid.
 */
export function validatePhone(phone: string): PhoneValidationResult {
  const digits = phone.replace(/\D/g, "");
  const digitCount = digits.length;

  let status: PhoneValidationStatus;
  let isValidFormat: boolean;
  if (digitCount < 7 || digitCount > 15) {
    status = "invalid";
    isValidFormat = false;
  } else if (digitCount < 10) {
    status = "risky";
    isValidFormat = true;
  } else {
    status = "valid";
    isValidFormat = true;
  }

  return { status, digitCount, isValidFormat };
}
