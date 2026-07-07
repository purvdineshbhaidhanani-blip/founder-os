import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "./password.js";
import { OrganizationService } from "./organization-service.js";
import { SessionService, type IssuedSession } from "./session-service.js";
import type { IdentityStore } from "./store.js";
import type { Organization, User } from "./types.js";

export interface RequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RegisterInput extends RequestMeta {
  email: string;
  password: string;
  /** If provided, a new organization is created and the new user becomes its owner. */
  organizationName?: string;
}

export interface RegisterResult {
  user: User;
  organization: Organization | null;
  issuedSession: IssuedSession;
}

export interface LoginInput extends RequestMeta {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  organizations: Organization[];
  issuedSession: IssuedSession;
}

/**
 * User account lifecycle: register, login, logout. Delegates organization
 * creation to `OrganizationService` and session issuance to
 * `SessionService` rather than duplicating either — this class is the
 * orchestration point, not where org or session logic actually lives.
 */
export class AuthService {
  private readonly organizations: OrganizationService;

  constructor(
    private readonly store: IdentityStore,
    private readonly sessions: SessionService,
  ) {
    this.organizations = new OrganizationService(store);
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    const existing = await this.store.getUserByEmail(input.email);
    if (existing) throw new Error(`An account with email "${input.email}" already exists.`);

    const passwordHash = await hashPassword(input.password);
    const user = await this.store.createUser({ email: input.email, passwordHash });
    await this.store.recordAuditLog({ organizationId: null, actorUserId: user.id, action: "user.registered", targetType: "user", targetId: user.id });

    let organization: Organization | null = null;
    if (input.organizationName) {
      const created = await this.organizations.createOrganization(user.id, input.organizationName);
      organization = created.organization;
    }

    const issuedSession = await this.sessions.create({
      userId: user.id,
      organizationId: organization?.id ?? null,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return { user, organization, issuedSession };
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.store.getUserByEmail(input.email);
    if (!user) throw new Error("Invalid email or password.");
    if (user.disabledAt) throw new Error("This account has been disabled.");

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password.");

    await this.store.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    const memberships = await this.store.listMembershipsForUser(user.id);
    const organizations = (
      await Promise.all(memberships.map((m) => this.store.getOrganizationById(m.organizationId)))
    ).filter((o): o is Organization => o !== null);

    // A single-org user lands directly in that org; multi-org (or zero-org)
    // users get no active organization until they explicitly switch/create one.
    const organizationId = organizations.length === 1 ? organizations[0]!.id : null;

    const issuedSession = await this.sessions.create({
      userId: user.id,
      organizationId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await this.store.recordAuditLog({ organizationId, actorUserId: user.id, action: "user.login", targetType: "user", targetId: user.id });

    return { user, organizations, issuedSession };
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
    await this.store.recordAuditLog({ organizationId: null, actorUserId: userId, action: "user.logout" });
  }

  /** Switches a session's active organization, after verifying the user is actually a member of it. */
  async switchOrganization(sessionId: string, userId: string, organizationId: string): Promise<Organization> {
    const membership = await this.store.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active") {
      throw new Error("You are not an active member of that organization.");
    }
    const organization = await this.store.getOrganizationById(organizationId);
    if (!organization) throw new Error("Organization not found.");

    await this.sessions.switchOrganization(sessionId, organizationId);
    await this.store.recordAuditLog({
      organizationId,
      actorUserId: userId,
      action: "organization.switched",
      targetType: "organization",
      targetId: organizationId,
    });
    return organization;
  }
}
