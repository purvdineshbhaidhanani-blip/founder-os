import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AdminShell } from "../../src/admin/AdminShell.js";
import { ConfirmDialog } from "../../src/admin/ConfirmDialog.js";
import { UsersPanel, type AdminUserRow } from "../../src/admin/UsersPanel.js";
import { RolesPermissionsPanel } from "../../src/admin/RolesPermissionsPanel.js";
import { BillingPanel } from "../../src/admin/BillingPanel.js";
import { IntegrationsPanel, type IntegrationDefinition } from "../../src/admin/IntegrationsPanel.js";
import { AuditLogPanel } from "../../src/admin/AuditLogPanel.js";

describe("AdminShell", () => {
  it("renders children when authorized", () => {
    render(
      <AdminShell navItems={[]} isAuthorized={true}>
        <p>Admin content</p>
      </AdminShell>,
    );
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("renders an access-denied state instead of children when not authorized", () => {
    render(
      <AdminShell navItems={[]} isAuthorized={false}>
        <p>Admin content</p>
      </AdminShell>,
    );
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Deactivate Priya?"
        description="This can be reversed later."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog isOpen={true} title="Delete data?" description="This cannot be undone." onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

const sampleUsers: AdminUserRow[] = [
  { id: "1", name: "Priya Shah", email: "priya@acme.com", role: "admin", status: "active", lastActiveAt: "2026-07-09" },
  { id: "2", name: "Sam Lee", email: "sam@acme.com", role: "member", status: "invited" },
];

describe("UsersPanel", () => {
  it("shows a confirm dialog and calls onDeactivate after confirming", async () => {
    const onDeactivate = vi.fn().mockResolvedValue(undefined);
    render(
      <UsersPanel
        users={sampleUsers}
        roleOptions={[{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }]}
        onRoleChange={vi.fn()}
        onDeactivate={onDeactivate}
        canManage={true}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Deactivate" })[0]!);
    expect(screen.getByText("Deactivate Priya Shah?")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(onDeactivate).toHaveBeenCalledWith("1"));
  });

  it("hides role editing and deactivate actions when canManage is false", () => {
    render(
      <UsersPanel
        users={sampleUsers}
        roleOptions={[{ value: "admin", label: "Admin" }]}
        onRoleChange={vi.fn()}
        onDeactivate={vi.fn()}
        canManage={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });
});

describe("RolesPermissionsPanel", () => {
  it("renders a check for granted role/permission pairs and blank otherwise", () => {
    render(
      <RolesPermissionsPanel
        roles={[{ key: "admin", label: "Admin" }, { key: "viewer", label: "Viewer" }]}
        permissions={[{ key: "billing.manage", label: "Manage billing" }]}
        hasPermission={(role) => role === "admin"}
      />,
    );
    expect(screen.getByText("Admin has Manage billing")).toBeInTheDocument();
    expect(screen.getByText("Viewer does not have Manage billing")).toBeInTheDocument();
  });
});

describe("BillingPanel", () => {
  it("shows the disabled state when billing isn't configured", () => {
    render(<BillingPanel isConfigured={false} />);
    expect(screen.getByText("Billing isn't configured yet")).toBeInTheDocument();
  });

  it("shows plan and invoices when configured", () => {
    render(
      <BillingPanel
        isConfigured={true}
        planName="Growth"
        planPrice="$99/mo"
        invoices={[{ id: "inv_1", issuedAt: "2026-07-01", amount: "$99.00", status: "paid" }]}
      />,
    );
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("$99.00")).toBeInTheDocument();
  });
});

const sampleIntegrations: IntegrationDefinition[] = [
  { key: "slack", name: "Slack", description: "Send alerts to Slack.", status: "disabled", isAvailable: true },
  { key: "salesforce", name: "Salesforce", description: "Sync contacts.", status: "disabled", isAvailable: false },
];

describe("IntegrationsPanel", () => {
  it("disables Connect for integrations without platform credentials configured", () => {
    render(<IntegrationsPanel integrations={sampleIntegrations} onConnect={vi.fn()} onDisconnect={vi.fn()} />);
    const buttons = screen.getAllByRole("button", { name: "Connect" });
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("calls onConnect for an available integration", async () => {
    const onConnect = vi.fn();
    render(<IntegrationsPanel integrations={sampleIntegrations} onConnect={onConnect} onDisconnect={vi.fn()} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]!);
    expect(onConnect).toHaveBeenCalledWith("slack");
  });
});

describe("AuditLogPanel", () => {
  it("renders audit entries read-only", () => {
    render(
      <AuditLogPanel
        entries={[{ id: "1", actorName: "Priya Shah", action: "updated role", target: "Sam Lee", occurredAt: "2026-07-10T12:00:00Z" }]}
      />,
    );
    expect(screen.getByText("updated role")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });
});
