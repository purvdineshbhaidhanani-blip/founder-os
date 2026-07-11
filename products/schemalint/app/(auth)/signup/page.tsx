"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button } from "@founder-os/ui/primitives";

export default function SignUpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const organizationName = String(formData.get("organizationName") ?? "");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          displayName: formData.get("displayName"),
          organizationName,
          organizationSlug: organizationName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="sl-auth-page">
      <Card className="sl-auth-card">
        <CardHeader>
          <CardTitle>Start your 14-day free trial</CardTitle>
          <CardDescription>Full Pro features, no credit card required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="sl-auth-form" onSubmit={handleSubmit}>
            <Input name="displayName" label="Your name" required autoComplete="name" />
            <Input name="organizationName" label="Company name" required autoComplete="organization" />
            <Input name="email" type="email" label="Work email" required autoComplete="email" />
            <Input name="password" type="password" label="Password" required minLength={12} autoComplete="new-password" hint="At least 12 characters." />
            {error && <p className="fos-field-error" role="alert">{error}</p>}
            <Button type="submit" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>
          <p className="sl-auth-footer">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
