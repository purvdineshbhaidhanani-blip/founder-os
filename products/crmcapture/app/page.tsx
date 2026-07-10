import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "AI lead extraction", description: "Paste a raw email or form submission and get a structured, enriched contact — no manual typing." },
  { title: "Automatic deduplication", description: "Detect duplicate leads by email or phone across every source before they pollute your CRM." },
  { title: "AI Sales Assistant", description: "Every lead gets a summary, a suggested next step, and a ready-to-send follow-up email." },
  { title: "Lead scoring", description: "Leads are scored automatically from source, company, title, and contact completeness." },
];

export default function LandingPage() {
  return (
    <main className="cc-landing">
      <header className="cc-landing-header">
        <span className="cc-landing-logo">CRMCapture</span>
        <nav className="cc-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="cc-landing-hero">
        <h1>Stop typing leads into your CRM. Let it capture itself.</h1>
        <p>
          CRMCapture automatically extracts, enriches, deduplicates, and scores every lead from your web forms and
          emails — then drafts the follow-up so your reps sell instead of typing.
        </p>
        <div className="cc-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Start your 14-day free trial
          </Link>
        </div>
      </section>

      <section className="cc-landing-features">
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
