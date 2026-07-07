import type { AuthStrategy } from "../types.js";

export interface OAuth2Endpoints {
  authorizationUrl: string;
  tokenUrl: string;
}

export interface OAuth2ClientConfig extends OAuth2Endpoints {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  fetchImpl?: typeof fetch;
}

export interface OAuth2Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

function toToken(response: TokenResponse): OAuth2Token {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type,
    expiresAt: response.expires_in
      ? new Date(Date.now() + response.expires_in * 1000).toISOString()
      : undefined,
  };
}

/**
 * Generic OAuth2 authorization-code client — works against any provider's
 * standard endpoints, so it carries no vendor-specific logic. Pair with
 * `OAuth2AuthStrategy` to auto-refresh and attach the resulting token.
 */
export class OAuth2Client {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OAuth2ClientConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  authorizationUrl(state: string): string {
    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    if (this.config.scopes?.length) url.searchParams.set("scope", this.config.scopes.join(" "));
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuth2Token> {
    const response = await this.fetchImpl(this.config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    if (!response.ok) throw new Error(`OAuth2 code exchange failed: ${await response.text()}`);
    return toToken((await response.json()) as TokenResponse);
  }

  async refresh(refreshToken: string): Promise<OAuth2Token> {
    const response = await this.fetchImpl(this.config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    if (!response.ok) throw new Error(`OAuth2 refresh failed: ${await response.text()}`);
    return toToken((await response.json()) as TokenResponse);
  }
}

export interface OAuth2AuthStrategyOptions {
  client: OAuth2Client;
  /** Initial token; the strategy refreshes it in place once it's within `refreshSkewMs` of expiring. */
  token: OAuth2Token;
  refreshSkewMs?: number;
  onTokenRefreshed?: (token: OAuth2Token) => void;
}

/** Attaches a bearer token to requests, transparently refreshing it before it expires. */
export class OAuth2AuthStrategy implements AuthStrategy {
  readonly type = "oauth2" as const;
  private token: OAuth2Token;
  /**
   * In-flight refresh, shared by every concurrent `applyAuth` call. Without
   * this, N concurrent requests near token expiry each fire their own
   * `refresh()` with the same refresh token; most OAuth providers rotate and
   * invalidate the refresh token on first use, so every refresh after the
   * first would fail. Single-flighting it means only one refresh ever
   * happens per expiry.
   */
  private refreshing?: Promise<OAuth2Token>;

  constructor(private readonly options: OAuth2AuthStrategyOptions) {
    this.token = options.token;
  }

  private needsRefresh(): boolean {
    if (!this.token.expiresAt) return false;
    const skew = this.options.refreshSkewMs ?? 60_000;
    return new Date(this.token.expiresAt).getTime() - Date.now() < skew;
  }

  private refreshOnce(refreshToken: string): Promise<OAuth2Token> {
    if (!this.refreshing) {
      this.refreshing = this.options.client
        .refresh(refreshToken)
        .then((token) => {
          this.options.onTokenRefreshed?.(token);
          return token;
        })
        .finally(() => {
          this.refreshing = undefined;
        });
    }
    return this.refreshing;
  }

  async applyAuth(request: { headers: Record<string, string>; query: Record<string, string> }): Promise<void> {
    if (this.needsRefresh() && this.token.refreshToken) {
      this.token = await this.refreshOnce(this.token.refreshToken);
    }
    request.headers.Authorization = `${this.token.tokenType ?? "Bearer"} ${this.token.accessToken}`;
  }
}
