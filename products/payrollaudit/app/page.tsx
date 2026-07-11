import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Payroll validation", description: "Import a payroll run and validate every payslip line's gross pay, tax withholding, and net reconciliation against expected calculations." },
  { title: "Attendance reconciliation", description: "Catch missing or mismatched hours by reconciling hours paid against attendance records for every employee." },
  { title: "AI Payroll Copilot", description: "Before payroll is processed, AI explains what's wrong across a run in plain language and recommends fixes — before employees are paid." },
  { title: "Compliance reports", description: "Exportable findings, per-employee status, and a compliance score you can hand to auditors or leadership." },
];

export default function LandingPage() {
  return (
    <main className="pa-landing">
      <header className="pa-landing-header">
        <span className="pa-landing-logo">PayrollAudit</span>
        <nav className="pa-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="pa-landing-hero">
        <h1>Catch payroll errors before employees are paid.</h1>
        <p>
          PayrollAudit validates salary calculations, tax withholding, and attendance reconciliation for every
          payroll run before disbursement — with an AI Payroll Copilot that explains what&rsquo;s wrong and
          recommends fixes before money moves.
        </p>
        <div className="pa-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Validate your first payroll run
          </Link>
        </div>
      </section>

      <section className="pa-landing-features">
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
