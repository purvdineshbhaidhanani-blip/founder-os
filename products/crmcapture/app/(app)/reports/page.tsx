import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Reports</h1>
          <p className="cc-page-description">Export your pipeline data.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads report</CardTitle>
          <CardDescription>Every lead, its contact, status, score, and source — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/leads" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
