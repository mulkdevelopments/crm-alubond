import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../backend/package.json"));
const nodemailer = require("nodemailer");

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

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeIcsText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtcDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const env = loadEnv(resolve("backend/.env"));
const to = process.argv[2] ?? "shibinshamunna912@gmail.com";
const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
dueAt.setMinutes(0, 0, 0);
const end = new Date(dueAt.getTime() + 30 * 60 * 1000);
const projectName = "Dubai Marina Tower Cladding";
const contact = "Ahmed Al Mansoori";
const summary = `Follow-up: ${projectName} – ${contact}`;
const description = [
  `Project: ${projectName}`,
  `Contact: ${contact} (Consultant)`,
  "Channel: Visit",
  "Status: Due today",
  "Note: Follow up on revised BOQ and fire-rating sample approval.",
  `CRM: ${env.APP_BASE_URL || "https://alubond-crm-web.onrender.com"}/follow-ups`,
].join("\n");

const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Alubond CRM//Follow-up Notification//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  "UID:sample-follow-up@crm.alubond.com",
  `DTSTAMP:${formatIcsUtcDate(new Date())}`,
  `DTSTART:${formatIcsUtcDate(dueAt)}`,
  `DTEND:${formatIcsUtcDate(end)}`,
  `SUMMARY:${escapeIcsText(summary)}`,
  `DESCRIPTION:${escapeIcsText(description)}`,
  "STATUS:CONFIRMED",
  "TRANSP:OPAQUE",
  "END:VEVENT",
  "END:VCALENDAR",
  "",
].join("\r\n");

const googleUrl =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent(summary)}` +
  `&dates=${formatIcsUtcDate(dueAt)}/${formatIcsUtcDate(end)}` +
  `&details=${encodeURIComponent(description)}`;

const outlookUrl =
  "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
  `&subject=${encodeURIComponent(summary)}` +
  `&body=${encodeURIComponent(description)}` +
  `&startdt=${encodeURIComponent(dueAt.toISOString())}` +
  `&enddt=${encodeURIComponent(end.toISOString())}`;

const dueAtLabel = dueAt.toLocaleString("en-AE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const appLink = `${env.APP_BASE_URL || "https://alubond-crm-web.onrender.com"}/follow-ups`;
const subject = `[Alubond CRM] Follow-up created: ${projectName}`;
const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
    <p style="margin:0 0 16px">Hello Shibin,</p>
    <p style="margin:0 0 16px">A follow-up has been <strong>created</strong> by manager1@alubondcrm.local.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Project</td><td style="padding:6px 0"><strong>${escapeHtml(projectName)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Contact</td><td style="padding:6px 0">${escapeHtml(contact)} (Consultant)</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Channel</td><td style="padding:6px 0">Visit</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Due</td><td style="padding:6px 0">${escapeHtml(dueAtLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0">Due today</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Note</td><td style="padding:6px 0">Follow up on revised BOQ and fire-rating sample approval.</td></tr>
    </table>
    <p style="margin:0 0 10px;font-weight:600">Add to calendar</p>
    <p style="margin:0 0 12px;color:#64748b;font-size:13px">Open the attached <strong>follow-up.ics</strong> file, or use a quick link:</p>
    <p style="margin:0 0 20px">
      <a href="${escapeHtml(googleUrl)}" style="display:inline-block;margin-right:8px;margin-bottom:8px;background:#0f172a;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-size:13px">Google Calendar</a>
      <a href="${escapeHtml(outlookUrl)}" style="display:inline-block;margin-right:8px;margin-bottom:8px;background:#0078d4;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-size:13px">Outlook</a>
    </p>
    <p style="margin:0 0 20px"><a href="${escapeHtml(appLink)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">Open follow-ups</a></p>
    <p style="margin:0;color:#64748b;font-size:13px">Alubond CRM · no-reply@crm.alubond.com</p>
  </div>
`.trim();

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === "true",
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

await transporter.sendMail({
  from: env.EMAIL_FROM,
  to,
  subject,
  text: `Sample follow-up with calendar attachment.\n\nGoogle Calendar: ${googleUrl}\nOutlook: ${outlookUrl}`,
  html,
  attachments: [
    {
      filename: "follow-up.ics",
      content: ics,
      contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    },
  ],
});

console.log(`Calendar sample sent to ${to}`);
