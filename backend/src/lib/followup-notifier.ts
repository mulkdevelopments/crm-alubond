import { Resend } from "resend";

import { env } from "../config/env";
import { emailButtonStyle, wrapEmailHtml } from "./email-layout";
import { prisma } from "./prisma";

type FollowUpNotificationAction = "created" | "updated";

const CALENDAR_DURATION_MS = 30 * 60 * 1000;

let resendClient: Resend | null | undefined;

function getResendApiKey() {
  return env.RESEND_API_KEY || env.SMTP_PASS;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtcDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildFollowUpCalendarEvent(input: {
  followUpId: string;
  projectName: string;
  contact: string;
  contactRole: string;
  channel: string;
  status: string;
  note: string;
  dueAt: Date;
  appLink: string | null;
}) {
  const start = new Date(input.dueAt);
  const end = new Date(start.getTime() + CALENDAR_DURATION_MS);
  const summary = `Follow-up: ${input.projectName} – ${input.contact}`;
  const descriptionLines = [
    `Project: ${input.projectName}`,
    `Contact: ${input.contact} (${input.contactRole})`,
    `Channel: ${input.channel}`,
    `Status: ${input.status}`,
    `Note: ${input.note}`,
    input.appLink ? `CRM: ${input.appLink}` : "",
  ].filter(Boolean);
  const description = descriptionLines.join("\n");
  const uid = `${input.followUpId}@crm.alubond.com`;
  const dtStamp = formatIcsUtcDate(new Date());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Alubond CRM//Follow-up Notification//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatIcsUtcDate(start)}`,
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
    `&dates=${formatIcsUtcDate(start)}/${formatIcsUtcDate(end)}` +
    `&details=${encodeURIComponent(description)}`;

  const outlookUrl =
    "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
    `&subject=${encodeURIComponent(summary)}` +
    `&body=${encodeURIComponent(description)}` +
    `&startdt=${encodeURIComponent(start.toISOString())}` +
    `&enddt=${encodeURIComponent(end.toISOString())}`;

  return { ics, googleUrl, outlookUrl, summary, start, end };
}

export function isEmailConfigured() {
  return Boolean(getResendApiKey());
}

function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;

  const apiKey = getResendApiKey();
  if (!apiKey) {
    resendClient = null;
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function buildFollowUpEmail(input: {
  recipientName: string;
  actor: string;
  action: FollowUpNotificationAction;
  projectName: string;
  contact: string;
  contactRole: string;
  channel: string;
  dueAtLabel: string;
  status: string;
  note: string;
  appLink: string | null;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
}) {
  const actionLabel = input.action === "created" ? "created" : "updated";
  const subject = `[Alubond CRM] Follow-up ${actionLabel}: ${input.projectName}`;
  const textLines = [
    `Hello ${input.recipientName},`,
    "",
    `A follow-up has been ${actionLabel} by ${input.actor}.`,
    "",
    `Project: ${input.projectName}`,
    `Contact: ${input.contact} (${input.contactRole})`,
    `Channel: ${input.channel}`,
    `Due: ${input.dueAtLabel}`,
    `Status: ${input.status}`,
    `Note: ${input.note}`,
    "",
    "Add to calendar:",
    `- Open the attached follow-up.ics file, or`,
    `- Google Calendar: ${input.googleCalendarUrl}`,
    `- Outlook: ${input.outlookCalendarUrl}`,
    input.appLink ? `Open follow-ups: ${input.appLink}` : "",
    "",
    "Regards,",
    "Alubond CRM",
  ].filter(Boolean);

  const html = wrapEmailHtml(`
      <p style="margin:0 0 16px">Hello ${escapeHtml(input.recipientName)},</p>
      <p style="margin:0 0 16px">A follow-up has been <strong>${actionLabel}</strong> by ${escapeHtml(input.actor)}.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Project</td><td style="padding:6px 0"><strong>${escapeHtml(input.projectName)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Contact</td><td style="padding:6px 0">${escapeHtml(input.contact)} (${escapeHtml(input.contactRole)})</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Channel</td><td style="padding:6px 0">${escapeHtml(input.channel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Due</td><td style="padding:6px 0">${escapeHtml(input.dueAtLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0">${escapeHtml(input.status)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Note</td><td style="padding:6px 0">${escapeHtml(input.note)}</td></tr>
      </table>
      <p style="margin:0 0 10px;font-weight:600">Add to calendar</p>
      <p style="margin:0 0 12px;color:#64748b;font-size:13px">Open the attached <strong>follow-up.ics</strong> file, or use a quick link:</p>
      <p style="margin:0 0 20px">
        <a href="${escapeHtml(input.googleCalendarUrl)}" style="display:inline-block;margin-right:8px;margin-bottom:8px;background:#0f172a;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-size:13px">Google Calendar</a>
        <a href="${escapeHtml(input.outlookCalendarUrl)}" style="display:inline-block;margin-right:8px;margin-bottom:8px;background:#0078d4;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;font-size:13px">Outlook</a>
      </p>
      ${
        input.appLink
          ? `<p style="margin:0 0 20px"><a href="${escapeHtml(input.appLink)}" style="${emailButtonStyle()}">Open follow-ups</a></p>`
          : ""
      }
  `);

  return { subject, text: textLines.join("\n"), html };
}

export async function sendFollowUpNotificationById(input: {
  followUpId: string;
  action: FollowUpNotificationAction;
  actorName?: string | null;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    if (env.NODE_ENV !== "test") {
      console.warn("[email] Resend API key not configured; skipping follow-up notification.");
    }
    return;
  }

  const followUp = await prisma.followUp.findUnique({
    where: { id: input.followUpId },
    select: {
      id: true,
      contact: true,
      contactRole: true,
      dueAt: true,
      channel: true,
      status: true,
      note: true,
      projectId: true,
      project: {
        select: {
          name: true,
        },
      },
      owner: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!followUp?.owner?.email) return;

  const recipientName = `${followUp.owner.firstName ?? ""} ${followUp.owner.lastName ?? ""}`.trim() || "Team Member";
  const actor = input.actorName?.trim() || "CRM";
  const dueAtLabel = followUp.dueAt.toLocaleString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const appLink = env.APP_BASE_URL ? `${env.APP_BASE_URL}/follow-ups` : null;
  const calendar = buildFollowUpCalendarEvent({
    followUpId: followUp.id,
    projectName: followUp.project.name,
    contact: followUp.contact,
    contactRole: followUp.contactRole,
    channel: followUp.channel,
    status: followUp.status,
    note: followUp.note,
    dueAt: followUp.dueAt,
    appLink,
  });
  const { subject, text, html } = buildFollowUpEmail({
    recipientName,
    actor,
    action: input.action,
    projectName: followUp.project.name,
    contact: followUp.contact,
    contactRole: followUp.contactRole,
    channel: followUp.channel,
    dueAtLabel,
    status: followUp.status,
    note: followUp.note,
    appLink,
    googleCalendarUrl: calendar.googleUrl,
    outlookCalendarUrl: calendar.outlookUrl,
  });

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM || "Alubond CRM <no-reply@crm.alubond.com>",
      to: [followUp.owner.email],
      subject,
      text,
      html,
      attachments: [
        {
          filename: "follow-up.ics",
          content: Buffer.from(calendar.ics, "utf8").toString("base64"),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("[email] Failed to send follow-up notification:", error);
    throw error;
  }
}
