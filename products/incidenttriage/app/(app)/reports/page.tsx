import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Reports</h1>
          <p className="it-page-description">Export your incident history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident report</CardTitle>
          <CardDescription>Every incident, its service, severity, status, and duration — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/incidents" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
