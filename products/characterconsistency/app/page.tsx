import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Character library", description: "Define a character once — face, hair, outfit, art style — as a persistent, reusable identity object." },
  { title: "AI Character DNA", description: "Expands a short description into a detailed, locked prompt spec with negative prompts and distinguishing features." },
  { title: "Drift detection", description: "Every new pose request is checked against the character's locked attributes before it ever reaches your image generator." },
  { title: "Locked prompt output", description: "Get a ready-to-paste prompt for any image generator, consistent every time — no re-engineering." },
];

export default function LandingPage() {
  return (
    <main className="cc-landing">
      <header className="cc-landing-header">
        <span className="cc-landing-logo">CharacterConsistency</span>
        <nav className="cc-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="cc-landing-hero">
        <h1>Generate your character once. Keep it forever.</h1>
        <p>
          CharacterConsistency locks your character&rsquo;s face, hair, outfit, and identity into a reusable object,
          then checks every new generation request for drift before it ever reaches your image generator.
        </p>
        <div className="cc-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Create your first character
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
