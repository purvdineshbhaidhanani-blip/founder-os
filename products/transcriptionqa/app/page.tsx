import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@founder-os/ui/primitives";

const FEATURES = [
  { title: "Domain terminology validation", description: "Flags medical and legal terminology an ASR is likely to have gotten wrong, with a suggested correction for each." },
  { title: "Speaker attribution checks", description: "Catches the classic diarization glitch — a short segment misattributed to the wrong speaker between two turns from someone else." },
  { title: "AI Accuracy Copilot", description: "Summarizes the transcript, highlights the riskiest sections, and scores overall publish/file readiness before it goes out." },
  { title: "Plain-text export", description: "Export a transcript with its unresolved suggested corrections listed, ready for a final human pass." },
];

export default function LandingPage() {
  return (
    <main className="tq-landing">
      <header className="tq-landing-header">
        <span className="tq-landing-logo">TranscriptionQA</span>
        <nav className="tq-landing-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-md">
            Start free
          </Link>
        </nav>
      </header>

      <section className="tq-landing-hero">
        <h1>Trust your transcripts before you publish or file them.</h1>
        <p>
          TranscriptionQA reviews any transcript for domain-specific terminology errors and speaker-attribution
          mistakes, then scores it — with an AI Accuracy Copilot that explains what&rsquo;s risky before it ships.
        </p>
        <div className="tq-landing-cta">
          <Link href="/signup" className="fos-btn fos-btn-primary fos-btn-lg">
            Review your first transcript
          </Link>
        </div>
      </section>

      <section className="tq-landing-features">
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
