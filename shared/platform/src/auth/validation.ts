import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export const signUpWithPasswordSchema = z.object({
  email: emailSchema,
  password: z.string().min(12, "Password must be at least 12 characters."),
  displayName: z.string().trim().min(1).max(120),
});
export type SignUpWithPasswordInput = z.infer<typeof signUpWithPasswordSchema>;

export const loginWithPasswordSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 characters."),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const requestMagicLinkSchema = z.object({
  email: emailSchema,
});
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

export const consumeMagicLinkSchema = z.object({
  token: z.string().min(1),
});
export type ConsumeMagicLinkInput = z.infer<typeof consumeMagicLinkSchema>;

export const verifyMfaCodeSchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits."),
});
export type VerifyMfaCodeInput = z.infer<typeof verifyMfaCodeSchema>;
