import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import {
  AuditService,
  AuthService,
  buildClearIdentitySessionCookieHeader,
  buildIdentitySessionCookieHeader,
  OrganizationService,
  requireIdentityUser,
  requireOrgPermission,
  requireOrganizationMembership,
  SessionService,
  type IdentityStore,
} from "../../identity/index.js";
import { PERMISSIONS } from "../../identity/permissions-catalog.js";

export interface IdentityContext {
  store: IdentityStore;
  sessions: SessionService;
  auth: AuthService;
  organizations: OrganizationService;
  audit: AuditService;
}

export function createIdentityContext(store: IdentityStore): IdentityContext {
  const sessions = new SessionService(store);
  return {
    store,
    sessions,
    auth: new AuthService(store, sessions),
    organizations: new OrganizationService(store),
    audit: new AuditService(store),
  };
}

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationName: z.string().min(1).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const CreateOrganizationBody = z.object({ name: z.string().min(1) });
const AddMemberBody = z.object({ email: z.string().email(), role: z.string().min(1) });
const ChangeRoleBody = z.object({ role: z.string().min(1) });
const CreateTeamBody = z.object({ name: z.string().min(1) });
const TeamMemberBody = z.object({ userId: z.string().min(1) });
const ProfileBody = z.object({
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});

function clientMeta(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
  const userAgent = Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] : req.headers["user-agent"];
  return { userAgent: userAgent ?? null, ipAddress: req.socket?.remoteAddress ?? null };
}

export function registerIdentityRoutes(router: Router, identity: IdentityContext): void {
  router.post("/api/identity/register", async (ctx) => {
    try {
      const body = ctx.body as z.infer<typeof RegisterBody>;
      const meta = clientMeta(ctx.req as never);
      const result = await identity.auth.register({ ...body, ...meta });
      ctx.res.setHeader("Set-Cookie", buildIdentitySessionCookieHeader(result.issuedSession.token));
      sendJson(ctx.res, 201, {
        user: { id: result.user.id, email: result.user.email },
        organization: result.organization,
      });
    } catch (error) {
      sendJson(ctx.res, 400, { error: error instanceof Error ? error.message : "Registration failed." });
    }
  }, RegisterBody);

  router.post("/api/identity/login", async (ctx) => {
    try {
      const body = ctx.body as z.infer<typeof LoginBody>;
      const meta = clientMeta(ctx.req as never);
      const result = await identity.auth.login({ ...body, ...meta });
      ctx.res.setHeader("Set-Cookie", buildIdentitySessionCookieHeader(result.issuedSession.token));
      sendJson(ctx.res, 200, {
        user: { id: result.user.id, email: result.user.email },
        organizations: result.organizations,
        activeOrganizationId: result.issuedSession.session.organizationId,
      });
    } catch {
      // Never distinguish "no such user" from "wrong password" in the response.
      sendJson(ctx.res, 401, { error: "Invalid email or password." });
    }
  }, LoginBody);

  router.post("/api/identity/logout", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    await identity.auth.logout(identityUser.session.id, identityUser.user.id);
    ctx.res.setHeader("Set-Cookie", buildClearIdentitySessionCookieHeader());
    sendJson(ctx.res, 200, { ok: true });
  });

  router.get("/api/identity/me", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const organizations = await identity.store.listOrganizationsForUser(identityUser.user.id);
    sendJson(ctx.res, 200, {
      user: { id: identityUser.user.id, email: identityUser.user.email },
      activeOrganizationId: identityUser.session.organizationId,
      organizations,
    });
  });

  // ── organizations ─────────────────────────────────────────────────────
  router.post("/api/identity/organizations", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const body = ctx.body as z.infer<typeof CreateOrganizationBody>;
    const { organization } = await identity.organizations.createOrganization(identityUser.user.id, body.name);
    sendJson(ctx.res, 201, organization);
  }, CreateOrganizationBody);

  router.get("/api/identity/organizations", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const organizations = await identity.store.listOrganizationsForUser(identityUser.user.id);
    sendJson(ctx.res, 200, organizations);
  });

  router.post("/api/identity/organizations/:orgId/switch", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    try {
      const organization = await identity.auth.switchOrganization(identityUser.session.id, identityUser.user.id, ctx.params.orgId!);
      sendJson(ctx.res, 200, organization);
    } catch (error) {
      sendJson(ctx.res, 403, { error: error instanceof Error ? error.message : "Cannot switch organization." });
    }
  });

  // ── members ─────────────────────────────────────────────────────────
  router.get("/api/identity/organizations/:orgId/members", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const membership = await requireOrganizationMembership(ctx, identity.store, identityUser, ctx.params.orgId!);
    if (!membership) return;
    sendJson(ctx.res, 200, await identity.organizations.listMembers(ctx.params.orgId!));
  });

  router.post("/api/identity/organizations/:orgId/members", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.MEMBERS_INVITE, ctx.params.orgId!);
    if (!authorized) return;
    try {
      const body = ctx.body as z.infer<typeof AddMemberBody>;
      const membership = await identity.organizations.addMemberByEmail(ctx.params.orgId!, body.email, body.role, authorized.identity.user.id);
      sendJson(ctx.res, 201, membership);
    } catch (error) {
      sendJson(ctx.res, 400, { error: error instanceof Error ? error.message : "Could not add member." });
    }
  }, AddMemberBody);

  router.post("/api/identity/organizations/:orgId/members/:userId/remove", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.MEMBERS_REMOVE, ctx.params.orgId!);
    if (!authorized) return;
    try {
      await identity.organizations.removeMember(ctx.params.orgId!, ctx.params.userId!, authorized.identity.user.id);
      sendJson(ctx.res, 200, { ok: true });
    } catch (error) {
      sendJson(ctx.res, 400, { error: error instanceof Error ? error.message : "Could not remove member." });
    }
  });

  router.post("/api/identity/organizations/:orgId/members/:userId/role", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.MEMBERS_ROLE_MANAGE, ctx.params.orgId!);
    if (!authorized) return;
    try {
      const body = ctx.body as z.infer<typeof ChangeRoleBody>;
      await identity.organizations.changeMemberRole(ctx.params.orgId!, ctx.params.userId!, body.role, authorized.identity.user.id);
      sendJson(ctx.res, 200, { ok: true });
    } catch (error) {
      sendJson(ctx.res, 400, { error: error instanceof Error ? error.message : "Could not change role." });
    }
  }, ChangeRoleBody);

  // ── teams ───────────────────────────────────────────────────────────
  router.get("/api/identity/organizations/:orgId/teams", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const membership = await requireOrganizationMembership(ctx, identity.store, identityUser, ctx.params.orgId!);
    if (!membership) return;
    sendJson(ctx.res, 200, await identity.organizations.listTeams(ctx.params.orgId!));
  });

  router.post("/api/identity/organizations/:orgId/teams", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.TEAMS_MANAGE, ctx.params.orgId!);
    if (!authorized) return;
    const body = ctx.body as z.infer<typeof CreateTeamBody>;
    const team = await identity.organizations.createTeam(ctx.params.orgId!, body.name, authorized.identity.user.id);
    sendJson(ctx.res, 201, team);
  }, CreateTeamBody);

  router.post("/api/identity/organizations/:orgId/teams/:teamId/delete", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.TEAMS_MANAGE, ctx.params.orgId!);
    if (!authorized) return;
    await identity.organizations.deleteTeam(ctx.params.orgId!, ctx.params.teamId!, authorized.identity.user.id);
    sendJson(ctx.res, 200, { ok: true });
  });

  router.get("/api/identity/organizations/:orgId/teams/:teamId/members", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const membership = await requireOrganizationMembership(ctx, identity.store, identityUser, ctx.params.orgId!);
    if (!membership) return;
    sendJson(ctx.res, 200, await identity.organizations.listTeamMembers(ctx.params.teamId!));
  });

  router.post("/api/identity/organizations/:orgId/teams/:teamId/members", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.TEAMS_MANAGE, ctx.params.orgId!);
    if (!authorized) return;
    try {
      const body = ctx.body as z.infer<typeof TeamMemberBody>;
      const member = await identity.organizations.addTeamMember(ctx.params.orgId!, ctx.params.teamId!, body.userId, authorized.identity.user.id);
      sendJson(ctx.res, 201, member);
    } catch (error) {
      sendJson(ctx.res, 400, { error: error instanceof Error ? error.message : "Could not add team member." });
    }
  }, TeamMemberBody);

  router.post("/api/identity/organizations/:orgId/teams/:teamId/members/:userId/remove", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.TEAMS_MANAGE, ctx.params.orgId!);
    if (!authorized) return;
    await identity.organizations.removeTeamMember(ctx.params.orgId!, ctx.params.teamId!, ctx.params.userId!, authorized.identity.user.id);
    sendJson(ctx.res, 200, { ok: true });
  });

  // ── audit log ───────────────────────────────────────────────────────
  router.get("/api/identity/organizations/:orgId/audit-logs", async (ctx) => {
    const authorized = await requireOrgPermission(ctx, identity, PERMISSIONS.AUDIT_VIEW, ctx.params.orgId!);
    if (!authorized) return;
    const limitParam = ctx.query.get("limit");
    const entries = await identity.audit.list({
      organizationId: ctx.params.orgId!,
      limit: limitParam ? Number(limitParam) : undefined,
    });
    sendJson(ctx.res, 200, entries);
  });

  // ── profile ─────────────────────────────────────────────────────────
  router.get("/api/identity/profile", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const profile = await identity.store.getProfile(identityUser.user.id);
    sendJson(ctx.res, 200, profile ?? { userId: identityUser.user.id, displayName: null, avatarUrl: null, timezone: null, locale: null, bio: null });
  });

  router.post("/api/identity/profile", async (ctx) => {
    const identityUser = await requireIdentityUser(ctx, identity);
    if (!identityUser) return;
    const body = ctx.body as z.infer<typeof ProfileBody>;
    const profile = await identity.store.upsertProfile(identityUser.user.id, body);
    sendJson(ctx.res, 200, profile);
  }, ProfileBody);
}
