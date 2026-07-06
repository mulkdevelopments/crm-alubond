import crypto from "crypto";

import { env } from "../config/env";
import { buildBrandedEmail, emailButtonStyle } from "./email-layout";
import { isEmailConfigured, sendEmail } from "./mailer";

export { isEmailConfigured as isAuthEmailConfigured };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createPasswordResetTokenValue() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function sendPasswordResetEmail(input: {
  email: string;
  firstName: string;
  resetUrl: string;
  appResetUrl?: string;
}) {
  const subject = "[Alubond CRM] Reset your password";
  const text = [
    `Hello ${input.firstName},`,
    "",
    "We received a request to reset your Alubond CRM password.",
    `Reset your password: ${input.resetUrl}`,
    input.appResetUrl ? `Open in mobile app: ${input.appResetUrl}` : "",
    "",
    "This link expires in 1 hour. If you did not request this, you can ignore this email.",
    "",
    "Alubond CRM",
  ]
    .filter(Boolean)
    .join("\n");

  const appButton = input.appResetUrl
    ? `<p style="margin:0 0 12px">
        <a href="${escapeHtml(input.appResetUrl)}" style="${emailButtonStyle()}">Open in Alubond CRM app</a>
      </p>`
    : "";

  const { html, attachments } = buildBrandedEmail(`
      <p style="margin:0 0 16px">Hello ${escapeHtml(input.firstName)},</p>
      <p style="margin:0 0 16px">We received a request to reset your Alubond CRM password.</p>
      ${appButton}
      <p style="margin:0 0 20px">
        <a href="${escapeHtml(input.resetUrl)}" style="${emailButtonStyle()}">Reset password in browser</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
  `);

  await sendEmail({ to: [input.email], subject, text, html, attachments });
}

export async function sendAccessRequestEmail(input: {
  adminEmails: string[];
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}) {
  if (input.adminEmails.length === 0) {
    throw new Error("No admin recipients configured");
  }

  const subject = `[Alubond CRM] Access request from ${input.firstName} ${input.lastName}`;
  const text = [
    "A new CRM access request was submitted.",
    "",
    `Name: ${input.firstName} ${input.lastName}`,
    `Email: ${input.email}`,
    `Message: ${input.message || "No message provided."}`,
    "",
    "Create the user from the Users admin page when approved.",
  ].join("\n");

  const { html, attachments } = buildBrandedEmail(`
      <p style="margin:0 0 16px">A new CRM access request was submitted.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Name</td><td style="padding:6px 0"><strong>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${escapeHtml(input.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Message</td><td style="padding:6px 0">${escapeHtml(input.message || "No message provided.")}</td></tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px">Create the user from the Users admin page when approved.</p>
  `);

  await sendEmail({ to: input.adminEmails, subject, text, html, attachments });
}
