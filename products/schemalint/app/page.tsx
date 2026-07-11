import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Index analysis", description: "Flags foreign key columns with no covering index — a common, consequential performance risk that surfaces late in production." },
  { title: "Integrity checks", description: "Catches tables missing a primary key before orphaned or unreliably-identified data accumulates." },
  { title: "Naming validation", description: "Checks table and column names against snake_case convention so schema drift doesn't confuse new engineers." },
  { title: "AI Database Architect", description: "Summarizes schema health and recommends prioritized, specific fixes — not just a list of rule violations." },
];

export default function LandingPage() {
  return (
    <main className="sl-landing">
      <header className="sl-landing-header">
        <span className="sl-landing-logo">SchemaLint</span>
        <nav className="sl-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="sl-landing-hero">
        <h1>Architect-level schema review, without an architect.</h1>
        <p>
          SchemaLint imports your database schema and finds the missing indexes, missing keys, and naming drift
          that quietly accumulate — then recommends specific fixes with an AI Database Architect before problems
          reach production.
        </p>
        <div className="sl-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Scan your first schema
          </Link>
        </div>
      </section>

      <section className="sl-landing-features">
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
