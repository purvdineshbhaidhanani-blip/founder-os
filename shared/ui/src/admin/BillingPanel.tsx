import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../primitives/Card.js";
import { Button } from "../primitives/Button.js";
import { EmptyState } from "../primitives/EmptyState.js";
import { DataTable, type DataTableColumn } from "../dashboard/DataTable.js";

export interface BillingUsageMetric {
  key: string;
  label: string;
  used: number;
  limit: number | null;
}

export interface BillingInvoiceRow {
  id: string;
  issuedAt: string;
  amount: string;
  status: string;
  downloadUrl?: string;
}

export interface BillingPanelProps {
  /** False when Stripe (or the product's payment provider) has no credentials configured — Phase 1 disabled state. */
  isConfigured: boolean;
  planName?: string;
  planPrice?: string;
  seatsUsed?: number;
  seatsLimit?: number;
  usage?: BillingUsageMetric[];
  invoices?: BillingInvoiceRow[];
  onManageBilling?: () => void;
  onUpgrade?: () => void;
  isLoading?: boolean;
}

/**
 * Billing admin module per frameworks/07-admin-panel-framework.md: plan,
 * seats, usage vs. limits, invoices. Built and wired to the pricing
 * framework but shows a clean disabled state — never a crash or a raw
 * error — until Phase 2 payment credentials exist
 * (standards/security.md's credential-gating pattern).
 */
export function BillingPanel({ isConfigured, planName, planPrice, seatsUsed, seatsLimit, usage = [], invoices = [], onManageBilling, onUpgrade, isLoading }: BillingPanelProps) {
  if (!isConfigured) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="Billing isn't configured yet"
            description="Payment processing hasn't been set up for this environment. Once it is, plan, usage, and invoices will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  const invoiceColumns: DataTableColumn<BillingInvoiceRow>[] = [
    { key: "issuedAt", header: "Date", render: (row) => row.issuedAt },
    { key: "amount", header: "Amount", align: "right", render: (row) => row.amount },
    { key: "status", header: "Status", render: (row) => row.status },
    {
      key: "download",
      header: "",
      align: "right",
      render: (row) =>
        row.downloadUrl && (
          <a href={row.downloadUrl} className="fos-admin-invoice-download">
            Download
          </a>
        ),
    },
  ];

  return (
    <div className="fos-admin-billing-panel">
      <Card>
        <CardHeader>
          <CardTitle>{planName ?? "Current plan"}</CardTitle>
          {planPrice && <CardDescription>{planPrice}</CardDescription>}
        </CardHeader>
        <CardContent>
          {seatsLimit !== undefined && seatsUsed !== undefined && (
            <p className="fos-admin-billing-seats">
              {seatsUsed} / {seatsLimit} seats used
            </p>
          )}
          {usage.map((metric) => (
            <p key={metric.key} className="fos-admin-billing-usage-line">
              {metric.label}: {metric.used}
              {metric.limit !== null ? ` / ${metric.limit}` : ""}
            </p>
          ))}
        </CardContent>
        <CardFooter>
          {onUpgrade && (
            <Button variant="primary" size="sm" onClick={onUpgrade}>
              Upgrade plan
            </Button>
          )}
          {onManageBilling && (
            <Button variant="outline" size="sm" onClick={onManageBilling}>
              Manage billing
            </Button>
          )}
        </CardFooter>
      </Card>

      <DataTable
        columns={invoiceColumns}
        rows={invoices}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices will appear here after your first billing cycle."
      />
    </div>
  );
}
