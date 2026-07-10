import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Drop-in auth API", description: "Email/password and OAuth for your app in minutes, with a scoped API key per project." },
  { title: "Security by default", description: "Argon2id password hashing, hashed session tokens, and audit-ready login events out of the box." },
  { title: "AI Security Advisor", description: "Proactively flags weak MFA policy, stale session TTLs, and login velocity anomalies before they become incidents." },
  { title: "Startup-friendly pricing", description: "Priced for the 1K-100K MAU range where startups scale fastest — no enterprise sales cycle." },
];

export default function LandingPage() {
  return (
    <main className="au-landing">
      <header className="au-landing-header">
        <span className="au-landing-logo">AuthStartup</span>
        <nav className="au-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="au-landing-hero">
        <h1>Ship production auth in a day, not a sprint.</h1>
        <p>
          AuthStartup gives your app every auth flow it needs — social login, magic links, MFA, RBAC — behind a
          simple API key, plus an AI Security Advisor that catches misconfigurations before they become incidents.
        </p>
        <div className="au-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Create your first project
          </Link>
        </div>
      </section>

      <section className="au-landing-features">
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
