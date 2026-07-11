import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">Reports</h1>
          <p className="pa-page-description">Export findings for compliance review.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings report</CardTitle>
          <CardDescription>Every finding across every payroll run — company, employee, category, severity, status — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/findings" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
