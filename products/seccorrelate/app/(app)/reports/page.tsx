import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Reports</h1>
          <p className="sc-page-description">Export your alert and correlation history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert report</CardTitle>
          <CardDescription>Every alert, its severity, status, and the two log events it correlates — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/alerts" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
