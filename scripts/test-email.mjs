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

async function main() {
  const apiKey = env.RESEND_API_KEY || env.SMTP_PASS;
  const from = env.EMAIL_FROM ?? "Alubond CRM <no-reply@crm.alubond.com>";
  const to = process.argv[2] ?? env.ADMIN_EMAIL ?? "admin@alubondcrm.local";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY or SMTP_PASS must be set in backend/.env");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "[Alubond CRM] Email integration test",
      text: "Resend HTTP API is configured correctly for Alubond CRM follow-up notifications.",
      html: "<p>Resend HTTP API is configured correctly for <strong>Alubond CRM</strong> follow-up notifications.</p>",
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? `Resend API error (${response.status})`);
  }

  console.log(`Test email sent to ${to}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
