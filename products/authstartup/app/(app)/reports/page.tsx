import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">Reports</h1>
          <p className="au-page-description">Export your security posture history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security findings report</CardTitle>
          <CardDescription>Every finding across every project — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/security" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
