import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../primitives/Card.js";
import { Badge } from "../primitives/Badge.js";
import { Button } from "../primitives/Button.js";
import { EmptyState } from "../primitives/EmptyState.js";

export interface IntegrationDefinition {
  key: string;
  name: string;
  description: string;
  icon?: ReactNode;
  status: "connected" | "disabled" | "error";
  /** False when the platform-level credentials for this provider aren't configured — Phase 1 disabled state, distinct from a per-org "disabled" status. */
  isAvailable: boolean;
}

export interface IntegrationsPanelProps {
  integrations: IntegrationDefinition[];
  onConnect: (key: string) => void;
  onDisconnect: (key: string) => void;
}

const STATUS_LABEL: Record<IntegrationDefinition["status"], string> = {
  connected: "Connected",
  disabled: "Not connected",
  error: "Needs attention",
};

/**
 * Integrations admin module per frameworks/07-admin-panel-framework.md:
 * connect/disconnect third-party services. Each integration is
 * individually gated by whether the platform has credentials configured
 * for it (frameworks/12-integrations.md) — unavailable integrations show
 * a disabled action, never a broken "Connect" button that errors.
 */
export function IntegrationsPanel({ integrations, onConnect, onDisconnect }: IntegrationsPanelProps) {
  if (integrations.length === 0) {
    return <EmptyState title="No integrations available" description="This product doesn't offer any integrations yet." />;
  }

  return (
    <div className="fos-admin-integrations-grid">
      {integrations.map((integration) => (
        <Card key={integration.key} className="fos-admin-integration-card">
          <CardHeader>
            <div className="fos-admin-integration-header">
              {integration.icon && (
                <span className="fos-admin-integration-icon" aria-hidden="true">
                  {integration.icon}
                </span>
              )}
              <CardTitle>{integration.name}</CardTitle>
              <Badge
                variant={integration.status === "connected" ? "success" : integration.status === "error" ? "destructive" : "default"}
              >
                {STATUS_LABEL[integration.status]}
              </Badge>
            </div>
            <CardDescription>{integration.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {!integration.isAvailable && (
              <p className="fos-admin-integration-unavailable">This integration isn't configured for this environment yet.</p>
            )}
          </CardContent>
          <CardFooter>
            {integration.status === "connected" ? (
              <Button variant="outline" size="sm" onClick={() => onDisconnect(integration.key)}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" size="sm" disabled={!integration.isAvailable} onClick={() => onConnect(integration.key)}>
                Connect
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
