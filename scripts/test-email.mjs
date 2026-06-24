import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(filePath) {
  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnv(resolve("backend/.env"));

async function sendViaResend({ from, to, subject, text, html }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set in backend/.env");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? `Resend API error (${response.status})`);
  }
}

async function sendViaSmtp({ from, to, subject, text, html }) {
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({ from, to, subject, text, html });
}

async function main() {
  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const from =
    env.EMAIL_FROM ??
    (smtpConfigured ? `Alubond CRM <${env.SMTP_USER}>` : "Alubond CRM <no-reply@crm.alubond.com>");
  const to = process.argv[2] ?? env.ADMIN_EMAIL ?? "admin@alubondcrm.local";
  const subject = "[Alubond CRM] Email integration test";
  const text = smtpConfigured
    ? "Company SMTP is configured correctly for Alubond CRM notifications."
    : "Resend HTTP API is configured correctly for Alubond CRM follow-up notifications.";
  const html = `<p>${text}</p>`;

  if (smtpConfigured) {
    await sendViaSmtp({ from, to, subject, text, html });
    console.log(`Test email sent via SMTP (${env.SMTP_HOST}) to ${to}`);
    return;
  }

  await sendViaResend({ from, to, subject, text, html });
  console.log(`Test email sent via Resend to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
