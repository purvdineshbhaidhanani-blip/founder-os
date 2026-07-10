/**
 * Transactional email templates. Kept intentionally simple (inline HTML,
 * no templating engine dependency) since these are short, well-defined
 * transactional messages, not marketing emails — matches
 * standards/engineering.md's "avoid premature abstraction."
 */

function wrapper(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${bodyHtml}
    <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">This is an automated message. If you didn't expect it, you can safely ignore it.</p>
  </body>
</html>`;
}

export function magicLinkEmail(params: { link: string; appName: string }): { subject: string; html: string; text: string } {
  return {
    subject: `Sign in to ${params.appName}`,
    html: wrapper(`
      <h2>Sign in to ${params.appName}</h2>
      <p>Click the button below to sign in. This link expires in 15 minutes.</p>
      <p><a href="${params.link}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Sign in</a></p>
      <p>Or copy this link: ${params.link}</p>
    `),
    text: `Sign in to ${params.appName}\n\n${params.link}\n\nThis link expires in 15 minutes.`,
  };
}

export function passwordResetEmail(params: { link: string; appName: string }): { subject: string; html: string; text: string } {
  return {
    subject: `Reset your ${params.appName} password`,
    html: wrapper(`
      <h2>Reset your password</h2>
      <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
      <p><a href="${params.link}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
      <p>If you didn't request this, your password is still safe — you can ignore this email.</p>
    `),
    text: `Reset your ${params.appName} password\n\n${params.link}\n\nThis link expires in 1 hour.`,
  };
}

export function invitationEmail(params: {
  link: string;
  appName: string;
  organizationName: string;
  inviterName: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `${params.inviterName} invited you to ${params.organizationName} on ${params.appName}`,
    html: wrapper(`
      <h2>You've been invited</h2>
      <p>${params.inviterName} invited you to join <strong>${params.organizationName}</strong> on ${params.appName}.</p>
      <p><a href="${params.link}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>
    `),
    text: `${params.inviterName} invited you to join ${params.organizationName} on ${params.appName}.\n\n${params.link}`,
  };
}

export function notificationDigestEmail(params: {
  appName: string;
  items: { title: string; body: string }[];
}): { subject: string; html: string; text: string } {
  const itemsHtml = params.items.map((i) => `<li><strong>${i.title}</strong> — ${i.body}</li>`).join("");
  const itemsText = params.items.map((i) => `- ${i.title}: ${i.body}`).join("\n");

  return {
    subject: `You have ${params.items.length} new notification${params.items.length === 1 ? "" : "s"} on ${params.appName}`,
    html: wrapper(`<h2>New notifications</h2><ul>${itemsHtml}</ul>`),
    text: `New notifications on ${params.appName}:\n\n${itemsText}`,
  };
}
