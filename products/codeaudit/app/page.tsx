import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "PR-integrated scanning", description: "Catch vulnerabilities, secrets, and quality issues in your code before merge — OWASP Top 10 + CWE coverage." },
  { title: "Code health score", description: "A single quantified health score per repo, per team, so debt accumulation is visible instead of silent." },
  { title: "AI Fix Engine", description: "Every finding gets a plain-language explanation, a risk score, and a production-ready suggested patch." },
  { title: "Debt tracking", description: "Every finding is scored by estimated effort to fix, so you can quantify the true cost of cutting corners." },
];

export default function LandingPage() {
  return (
    <main className="ca-landing">
      <header className="ca-landing-header">
        <span className="ca-landing-logo">CodeAudit</span>
        <nav className="ca-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="ca-landing-hero">
        <h1>Ship with confidence. Catch issues before production does.</h1>
        <p>
          CodeAudit scans your code for security vulnerabilities, secrets, and quality debt on every PR — giving
          engineering teams a single health score and an AI-suggested fix for every finding, instead of a pile of
          noisy warnings nobody reads.
        </p>
        <div className="ca-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Start scanning for free
          </Link>
        </div>
      </section>

      <section className="ca-landing-features">
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
