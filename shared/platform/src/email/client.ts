import nodemailer from "nodemailer";
import { getPlatformEnv, isEmailConfigured } from "../config/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";

/**
 * Transactional email, built and wired per standards/security.md's Phase 1
 * rule. Uses SMTP generically (works with SES, SendGrid, Postmark, or any
 * SMTP-compatible provider) rather than locking to one vendor's SDK —
 * consistent with standards/ai.md's "provider abstraction" philosophy
 * applied to email. `PLATFORM_EMAIL_PROVIDER_API_KEY` doubles as the SMTP
 * password for providers that authenticate that way (SendGrid, Postmark);
 * `PLATFORM_EMAIL_SMTP_HOST`/`PORT`/`USER` are read alongside it.
 */

let transport: nodemailer.Transporter | undefined;

function getTransport(): nodemailer.Transporter {
  if (!isEmailConfigured()) {
    throw integrationNotConfiguredError("Transactional email");
  }
  if (!transport) {
    const env = getPlatformEnv();
    transport = nodemailer.createTransport({
      host: process.env.PLATFORM_EMAIL_SMTP_HOST ?? "smtp.sendgrid.net",
      port: Number(process.env.PLATFORM_EMAIL_SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.PLATFORM_EMAIL_SMTP_USER ?? "apikey",
        pass: env.PLATFORM_EMAIL_PROVIDER_API_KEY,
      },
    });
  }
  return transport;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const env = getPlatformEnv();
  await getTransport().sendMail({
    from: env.PLATFORM_EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
