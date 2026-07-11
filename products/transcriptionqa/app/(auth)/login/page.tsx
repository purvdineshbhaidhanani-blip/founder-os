"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button } from "@founder-os/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Invalid email or password.");
        return;
      }
      if (body.data?.requiresMfa) {
        setError("MFA is required for this account. MFA verification isn't wired into this screen yet.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="tq-auth-page">
      <Card className="tq-auth-card">
        <CardHeader>
          <CardTitle>Log in to TranscriptionQA</CardTitle>
          <CardDescription>Welcome back.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="tq-auth-form" onSubmit={handleSubmit}>
            <Input name="email" type="email" label="Email" required autoComplete="email" />
            <Input name="password" type="password" label="Password" required autoComplete="current-password" />
            {error && <p className="fos-field-error" role="alert">{error}</p>}
            <Button type="submit" isLoading={isSubmitting}>
              Log in
            </Button>
          </form>
          <p className="tq-auth-footer">
            No account yet? <Link href="/signup">Start free trial</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
