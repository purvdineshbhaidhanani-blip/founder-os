import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Email & phone validation", description: "Real syntax, domain-shape, disposable-domain, and format checks — not a black box." },
  { title: "Fuzzy duplicate detection", description: "Catches duplicates across exact email/phone match and fuzzy name+company similarity." },
  { title: "AI Contact Health Engine", description: "Every contact gets lead quality, missing fields, suggested enrichment, and a confidence score." },
  { title: "One health score", description: "A single 0-100 score combining validity, completeness, and duplicate status." },
];

export default function LandingPage() {
  return (
    <main className="cv-landing">
      <header className="cv-landing-header">
        <span className="cv-landing-logo">ContactVerify</span>
        <nav className="cv-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="cv-landing-hero">
        <h1>Stop working dead leads. Know which contacts are real.</h1>
        <p>
          ContactVerify gives every contact a complete health profile — not just &ldquo;valid or invalid&rdquo; —
          so sales, marketing, and CRM teams stop wasting effort on dead leads and duplicate records.
        </p>
        <div className="cv-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Verify your first 500 contacts free
          </Link>
        </div>
      </section>

      <section className="cv-landing-features">
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
