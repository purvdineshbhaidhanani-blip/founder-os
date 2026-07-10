import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Real-time correlation", description: "No-code rules connect failed logins, firewall blocks, and endpoint signals across sources in seconds." },
  { title: "Alert aggregation", description: "Deduplicate and group related alerts by attack pattern instead of drowning analysts in noise." },
  { title: "AI Incident Graph", description: "Automatically reconstruct an attack timeline with root cause and recommended next actions." },
  { title: "MITRE ATT&CK mapping", description: "Every AI-analyzed alert is tagged with the techniques it matches, not just a severity score." },
];

export default function LandingPage() {
  return (
    <main className="sc-landing">
      <header className="sc-landing-header">
        <span className="sc-landing-logo">SecCorrelate</span>
        <nav className="sc-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="sc-landing-hero">
        <h1>Stop drowning in alerts. Start seeing attacks.</h1>
        <p>
          SecCorrelate synthesizes signals from firewalls, endpoints, identity systems, and applications into a
          single correlated view — giving your SOC answers in seconds, not days, at a fraction of enterprise SIEM cost.
        </p>
        <div className="sc-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Start your 14-day free trial
          </Link>
        </div>
      </section>

      <section className="sc-landing-features">
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
