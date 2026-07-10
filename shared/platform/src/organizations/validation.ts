import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only.");

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: slugSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(160),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const orgRoleSchema = z.enum(["owner", "admin", "member"]);

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: orgRoleSchema.default("member"),
  productRole: z.string().trim().max(60).optional(),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const updateMemberRoleSchema = z.object({
  role: orgRoleSchema,
  productRole: z.string().trim().max(60).nullable().optional(),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
