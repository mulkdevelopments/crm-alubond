import nodemailer, { Transporter } from "nodemailer";

import { env } from "../config/env";
import { prisma } from "./prisma";

type FollowUpNotificationAction = "created" | "updated";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  });
  return transporter;
}

export async function sendFollowUpNotificationById(input: {
  followUpId: string;
  action: FollowUpNotificationAction;
  actorName?: string | null;
}): Promise<void> {
  const mailer = getTransporter();
  if (!mailer) return;

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
  const dueAtLabel = followUp.dueAt.toLocaleString("en-AE");
  const appLink = env.APP_BASE_URL ? `${env.APP_BASE_URL}/follow-ups` : null;
  const subject = `[Alubond CRM] Follow-up ${input.action}: ${followUp.project.name}`;
  const messageLines = [
    `Hello ${recipientName},`,
    "",
    `A follow-up has been ${input.action} by ${actor}.`,
    "",
    `Project: ${followUp.project.name}`,
    `Contact: ${followUp.contact} (${followUp.contactRole})`,
    `Channel: ${followUp.channel}`,
    `Due: ${dueAtLabel}`,
    `Status: ${followUp.status}`,
    `Note: ${followUp.note}`,
    appLink ? `Open follow-ups: ${appLink}` : "",
    "",
    "Regards,",
    "Alubond CRM",
  ].filter(Boolean);

  await mailer.sendMail({
    from: env.EMAIL_FROM || env.SMTP_USER || "no-reply@alubondcrm.local",
    to: followUp.owner.email,
    subject,
    text: messageLines.join("\n"),
  });
}
