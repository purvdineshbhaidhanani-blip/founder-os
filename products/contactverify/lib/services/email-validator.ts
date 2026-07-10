const EMAIL_SYNTAX_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Known disposable/throwaway email domains — a small representative
 * blocklist. Real-time MX/mailbox verification is a live network call
 * requiring Phase 2 infrastructure; Phase 1 does syntax + domain-shape +
 * disposable-domain checks, which is exactly the offline-computable
 * subset of "deliverability-risk checks" per
 * products/contactverify/docs/PRODUCT_IDENTITY.md §7.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
]);

export type EmailValidationStatus = "valid" | "invalid" | "risky";

export interface EmailValidationResult {
  status: EmailValidationStatus;
  isValidSyntax: boolean;
  hasValidDomainShape: boolean;
  isDisposable: boolean;
}

export function validateEmail(email: string): EmailValidationResult {
  const isValidSyntax = EMAIL_SYNTAX_PATTERN.test(email);
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const hasValidDomainShape = isValidSyntax && domain.includes(".") && domain.split(".").pop()!.length >= 2;
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  let status: EmailValidationStatus;
  if (!isValidSyntax || !hasValidDomainShape) {
    status = "invalid";
  } else if (isDisposable) {
    status = "risky";
  } else {
    status = "valid";
  }

  return { status, isValidSyntax, hasValidDomainShape, isDisposable };
}
