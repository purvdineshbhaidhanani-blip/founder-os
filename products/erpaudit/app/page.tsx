import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "SoD violation detection", description: "Automatically catches segregation-of-duties conflicts — like a user who can both create a vendor and approve its payment." },
  { title: "Process validation", description: "Flags missing four-eyes controls and unenforced approval thresholds before an auditor finds them." },
  { title: "AI ERP Auditor", description: "Every finding gets an audit-ready narrative: what's wrong, compliance impact, recommended fix, business impact." },
  { title: "Compliance score", description: "One quantified score per ERP instance, tracked scan over scan." },
];

export default function LandingPage() {
  return (
    <main className="ea-landing">
      <header className="ea-landing-header">
        <span className="ea-landing-logo">ERPAudit</span>
        <nav className="ea-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="ea-landing-hero">
        <h1>Continuous ERP compliance, not an annual fire drill.</h1>
        <p>
          ERPAudit scans your SAP, Oracle, or Dynamics configuration export for segregation-of-duties violations
          and process deviations, then explains each one in an audit-ready narrative — replacing weeks of manual
          spreadsheet review with a compliance score you can check any day of the year.
        </p>
        <div className="ea-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Run your first audit
          </Link>
        </div>
      </section>

      <section className="ea-landing-features">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </main>
  );
}
