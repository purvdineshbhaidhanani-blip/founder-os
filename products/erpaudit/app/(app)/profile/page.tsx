"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, useToast } from "@founder-os/ui/primitives";

interface Profile {
  displayName: string;
  email: string;
}

export default function ProfilePage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((body) => setProfile(body.data));
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: formData.get("displayName") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't save profile", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Profile updated", variant: "success" });
      setProfile(body.data);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="ea-page-header">
        <h1 className="ea-page-title">Profile</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>{profile?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <form className="ea-auth-form" onSubmit={handleSave}>
              <Input name="displayName" label="Display name" defaultValue={profile.displayName} required />
              <div className="ea-form-actions">
                <Button type="submit" isLoading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
