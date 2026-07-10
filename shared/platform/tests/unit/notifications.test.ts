import { describe, expect, it } from "vitest";
import { magicLinkEmail, passwordResetEmail, invitationEmail, notificationDigestEmail } from "../../src/email/templates.js";
import { createNotificationSchema, setNotificationPreferenceSchema } from "../../src/notifications/validation.js";

describe("email templates", () => {
  it("magicLinkEmail includes the link in both html and text", () => {
    const result = magicLinkEmail({ link: "https://app.example.com/magic/abc123", appName: "SpendGov" });
    expect(result.subject).toContain("SpendGov");
    expect(result.html).toContain("https://app.example.com/magic/abc123");
    expect(result.text).toContain("https://app.example.com/magic/abc123");
  });

  it("passwordResetEmail includes the link and expiry note", () => {
    const result = passwordResetEmail({ link: "https://app.example.com/reset/xyz", appName: "CodeAudit" });
    expect(result.html).toContain("https://app.example.com/reset/xyz");
    expect(result.text).toContain("1 hour");
  });

  it("invitationEmail names the inviter and organization", () => {
    const result = invitationEmail({
      link: "https://app.example.com/invite/1",
      appName: "CRMCapture",
      organizationName: "Acme Inc",
      inviterName: "Jamie",
    });
    expect(result.subject).toContain("Jamie");
    expect(result.subject).toContain("Acme Inc");
    expect(result.html).toContain("Acme Inc");
  });

  it("notificationDigestEmail pluralizes correctly and lists every item", () => {
    const single = notificationDigestEmail({ appName: "SecCorrelate", items: [{ title: "Alert", body: "Something happened" }] });
    expect(single.subject).toContain("1 new notification ");

    const multiple = notificationDigestEmail({
      appName: "SecCorrelate",
      items: [
        { title: "Alert 1", body: "A" },
        { title: "Alert 2", body: "B" },
      ],
    });
    expect(multiple.subject).toContain("2 new notifications");
    expect(multiple.html).toContain("Alert 1");
    expect(multiple.html).toContain("Alert 2");
  });
});

describe("notifications validation", () => {
  it("defaults channels to an empty array (in-app only)", () => {
    const result = createNotificationSchema.parse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      category: "billing",
      title: "Payment received",
      body: "Thanks!",
    });
    expect(result.channels).toEqual([]);
  });

  it("accepts a valid preference update", () => {
    const result = setNotificationPreferenceSchema.safeParse({ channel: "email", category: "billing", enabled: false });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid channel", () => {
    const result = setNotificationPreferenceSchema.safeParse({ channel: "carrier_pigeon", category: "billing", enabled: true });
    expect(result.success).toBe(false);
  });
});
