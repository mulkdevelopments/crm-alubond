import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nodemailer from "nodemailer";

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

async function main() {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT ?? 587);
  const user = env.SMTP_USER ?? "resend";
  const pass = env.SMTP_PASS;
  const from = env.EMAIL_FROM ?? "Alubond CRM <no-reply@crm.alubond.com>";
  const to = process.argv[2] ?? env.ADMIN_EMAIL ?? "admin@alubondcrm.local";

  if (!host || !pass) {
    throw new Error("SMTP_HOST and SMTP_PASS must be set in backend/.env");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "[Alubond CRM] Email integration test",
    text: "Resend SMTP is configured correctly for Alubond CRM follow-up notifications.",
    html: "<p>Resend SMTP is configured correctly for <strong>Alubond CRM</strong> follow-up notifications.</p>",
  });

  console.log(`Test email sent to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
