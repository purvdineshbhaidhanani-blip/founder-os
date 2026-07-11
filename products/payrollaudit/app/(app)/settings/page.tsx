"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, useToast } from "@founder-os/ui/primitives";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsPage() {
  const { show } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((body) => setOrganization(body.data));
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't save settings", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Settings saved", variant: "success" });
      setOrganization(body.data);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="pa-page-header">
        <h1 className="pa-page-title">Settings</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Slug: {organization?.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          {organization && (
            <form className="pa-auth-form" onSubmit={handleSave}>
              <Input name="name" label="Organization name" defaultValue={organization.name} required />
              <div className="pa-form-actions">
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
