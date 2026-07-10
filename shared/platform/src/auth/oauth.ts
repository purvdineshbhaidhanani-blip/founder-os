import { getPlatformEnv, isOAuthProviderConfigured } from "../config/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";
import { getPlatformDb } from "../db/index.js";
import { encryptAtRest } from "../crypto/index.js";
import type { OAuthProvider } from "@prisma/client";

/**
 * OAuth is built and wired per standards/api.md conventions but stays fully
 * disabled — no client ID/secret required to run — until real credentials
 * are supplied in Phase 2 (standards/security.md). The UI affordance can
 * exist; the flow fails closed with INTEGRATION_NOT_CONFIGURED rather than
 * crashing.
 */

const AUTHORIZE_URLS: Record<OAuthProvider, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  github: "https://github.com/login/oauth/authorize",
};

const DEFAULT_SCOPES: Record<OAuthProvider, string[]> = {
  google: ["openid", "email", "profile"],
  microsoft: ["openid", "email", "profile"],
  github: ["read:user", "user:email"],
};

export function buildOAuthAuthorizeUrl(params: {
  provider: OAuthProvider;
  redirectUri: string;
  state: string;
}): string {
  if (!isOAuthProviderConfigured(params.provider)) {
    throw integrationNotConfiguredError(`OAuth provider "${params.provider}"`);
  }

  const clientId = clientIdFor(params.provider);
  const url = new URL(AUTHORIZE_URLS[params.provider]);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DEFAULT_SCOPES[params.provider].join(" "));
  url.searchParams.set("state", params.state);
  return url.toString();
}

function clientIdFor(provider: OAuthProvider): string {
  const env = getPlatformEnv();
  switch (provider) {
    case "google":
      return env.OAUTH_GOOGLE_CLIENT_ID as string;
    case "microsoft":
      return env.OAUTH_MICROSOFT_CLIENT_ID as string;
    case "github":
      return env.OAUTH_GITHUB_CLIENT_ID as string;
  }
}

/**
 * Links (or creates and links) a user account from a verified OAuth
 * provider identity. The actual authorization-code exchange and identity
 * verification with the provider happens in the product's route handler
 * (provider SDK specifics don't belong in this shared module); this
 * function is called once the caller already has a verified provider user
 * ID + email.
 */
export async function upsertOAuthIdentity(params: {
  appId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  /** Raw provider access/refresh tokens — encrypted internally before write, per standards/security.md. */
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}) {
  const db = getPlatformDb();
  const encryptedAccessToken = params.accessToken ? encryptAtRest(params.accessToken) : undefined;
  const encryptedRefreshToken = params.refreshToken ? encryptAtRest(params.refreshToken) : undefined;

  const existingAccount = await db.oAuthAccount.findUnique({
    where: {
      uq_oauth_accounts_provider_provider_user_id: {
        provider: params.provider,
        providerUserId: params.providerUserId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    await db.oAuthAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: params.tokenExpiresAt,
      },
    });
    return existingAccount.user;
  }

  const user = await db.user.upsert({
    where: { uq_users_app_id_email: { appId: params.appId, email: params.email } },
    create: {
      appId: params.appId,
      email: params.email,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      emailVerifiedAt: new Date(),
      status: "active",
    },
    update: {},
  });

  await db.oAuthAccount.create({
    data: {
      userId: user.id,
      provider: params.provider,
      providerUserId: params.providerUserId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: params.tokenExpiresAt,
    },
  });

  return user;
}
