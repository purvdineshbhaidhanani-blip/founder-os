import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Reports</h1>
          <p className="sg-page-description">Export your spend data.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly spend report</CardTitle>
          <CardDescription>Every active subscription, cost, and utilization — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/spend" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
