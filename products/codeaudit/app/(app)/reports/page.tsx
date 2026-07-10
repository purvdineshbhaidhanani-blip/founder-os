import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Reports</h1>
          <p className="ca-page-description">Export your findings history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings report</CardTitle>
          <CardDescription>Every finding, its repository, severity, and status — CSV, available on every plan.</CardDescription>
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
