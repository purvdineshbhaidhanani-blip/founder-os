import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useAuth } from "../router";
import { errorMessage } from "../lib/errors";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state_mismatch: "Google sign-in failed (security check did not match). Please try again.",
  oauth_failed: "Google sign-in failed. Please try again.",
};

export default function Login(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();

  const from = (location.state as { from?: Location } | null)?.from ?? "/dashboard";

  // The Google OAuth callback (server-side full-page redirect) reports
  // failures back to this page via a `?error=` query param — surface it in
  // the same error banner the founder-login form already uses.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorCode = params.get("error");
    if (errorCode && OAUTH_ERROR_MESSAGES[errorCode]) {
      setError(OAUTH_ERROR_MESSAGES[errorCode]);
    }
  }, [location.search]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      await refresh();
      navigate(typeof from === "string" ? from : "/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Login failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={(e) => void handleSubmit(e)}>
        <h1>Founder OS</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <div className="banner banner-error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="auth-divider">or</div>

        {/*
          Plain server-navigated link, not a fetch/JS call — the OAuth flow
          is a full-page redirect dance (browser -> Google -> our server
          callback -> browser), so this must be a real navigation that
          carries the session cookie the same way `getPipelineExportUrl` in
          web/src/api/client.ts documents for a similar server-redirect
          pattern.
        */}
        <a href="/api/auth/google" className="auth-google-button">
          Continue with Google
        </a>
      </form>
    </div>
  );
}
