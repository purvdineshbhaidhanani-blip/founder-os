import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">Reports</h1>
          <p className="tq-page-description">Export findings for quality review.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings report</CardTitle>
          <CardDescription>Every finding across every transcript — transcript, speaker, category, severity, status, suggested correction — CSV, available on every plan.</CardDescription>
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
