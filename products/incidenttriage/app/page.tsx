import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Alert correlation", description: "Related alerts from the same service auto-chain into a single incident instead of paging you five times." },
  { title: "AI Root Cause Copilot", description: "A 60-second AI brief: what broke, why, which service failed first, and how to fix it." },
  { title: "Service health dashboard", description: "Real-time healthy / degraded / down status per service, computed from live alert signal." },
  { title: "Incident reports", description: "Every incident's timeline, root cause, and resolution — exportable and searchable institutional memory." },
];

export default function LandingPage() {
  return (
    <main className="it-landing">
      <header className="it-landing-header">
        <span className="it-landing-logo">IncidentTriage</span>
        <nav className="it-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="it-landing-hero">
        <h1>Stop archaeology. Start fixing.</h1>
        <p>
          IncidentTriage correlates your alerts into incidents and gives on-call engineers an AI-generated root
          cause hypothesis in the first 60 seconds — replacing the first 30-45 minutes of every incident.
        </p>
        <div className="it-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Start triaging for free
          </Link>
        </div>
      </section>

      <section className="it-landing-features">
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
