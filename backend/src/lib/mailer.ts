import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "../config/env";

type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

let resendClient: Resend | null | undefined;

export function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function isResendConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

export function isEmailConfigured() {
  return isSmtpConfigured() || isResendConfigured();
}

export function getEmailFromAddress() {
  if (env.EMAIL_FROM) return env.EMAIL_FROM;
  if (isSmtpConfigured() && env.SMTP_USER) {
    return `Alubond CRM <${env.SMTP_USER}>`;
  }
  return "Alubond CRM <no-reply@crm.alubond.com>";
}

function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    resendClient = null;
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

async function sendViaSmtp(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: getEmailFromAddress(),
    to: input.to.join(", "),
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });
}

async function sendViaResend(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Email is not configured");
  }

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content:
        typeof attachment.content === "string"
          ? attachment.content
          : attachment.content.toString("base64"),
      contentType: attachment.contentType,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  if (isSmtpConfigured()) {
    await sendViaSmtp(input);
    return;
  }

  await sendViaResend(input);
}
