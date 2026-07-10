import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">Reports</h1>
          <p className="ea-page-description">Export your compliance findings for auditors or leadership.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings report</CardTitle>
          <CardDescription>Every finding, its instance, category, and severity — CSV, available on every plan.</CardDescription>
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
