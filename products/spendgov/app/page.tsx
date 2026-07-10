import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Duplicate tool detection", description: "Find the 10 project management tools and 5 communication platforms you're paying for twice." },
  { title: "Waste identification", description: "Unused subscriptions, over-provisioned licenses, redundant tools — flagged with an evidence trail." },
  { title: "Renewal calendar", description: "90-day advance alerts so procurement negotiates before auto-renewal, not after." },
  { title: "AI CFO Copilot", description: "A ranked, dollar-quantified action list — not another dashboard to interpret alone." },
];

export default function LandingPage() {
  return (
    <main className="sg-landing">
      <header className="sg-landing-header">
        <span className="sg-landing-logo">SpendGov</span>
        <nav className="sg-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="sg-landing-hero">
        <h1>Stop hemorrhaging money on SaaS and AI spend you can&rsquo;t see.</h1>
        <p>
          SpendGov gives finance teams one dashboard for every SaaS subscription and AI service, flags waste automatically, and turns
          it into a ranked, dollar-quantified action list — no 6-month procurement platform rollout required.
        </p>
        <div className="sg-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Start your 14-day free trial
          </Link>
        </div>
      </section>

      <section className="sg-landing-features">
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
