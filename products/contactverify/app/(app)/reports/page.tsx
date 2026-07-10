import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@founder-os/ui/primitives";

export default function ReportsPage() {
  return (
    <div>
      <div className="cv-page-header">
        <div>
          <h1 className="cv-page-title">Reports</h1>
          <p className="cv-page-description">Export your contact verification history.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts report</CardTitle>
          <CardDescription>Every contact, its verification status, and health score — CSV, available on every plan.</CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter>
          <a href="/api/reports/contacts" className="fos-btn fos-btn-primary fos-btn-sm" download>
            Download CSV
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
