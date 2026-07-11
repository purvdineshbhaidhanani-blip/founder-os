import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Reports</h1>
          <p className="cc-page-description">Export your generation history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generations report</CardTitle>
          <CardDescription>Every generation, its character, pose, and consistency score — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/generations" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
