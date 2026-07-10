import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Avatar upload itself (multipart file handling, storage) is a product-route
 * concern per standards/engineering.md ("routes parse, authorize, delegate")
 * — this module only validates and persists the resulting URL once a file
 * has been uploaded to object storage per standards/security.md's file
 * upload rules (type/size validated server-side, stored outside the web
 * root, never executed).
 */
export const setAvatarSchema = z.object({
  avatarUrl: z.string().url().max(2048),
});
export type SetAvatarInput = z.infer<typeof setAvatarSchema>;

export const updateAccountSettingsSchema = z.object({
  timezone: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type UpdateAccountSettingsInput = z.infer<typeof updateAccountSettingsSchema>;

export const userStatusSchema = z.enum(["active", "invited", "suspended", "deactivated"]);
export type UserStatusInput = z.infer<typeof userStatusSchema>;
