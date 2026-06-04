import { UserRole } from "@prisma/client";
import OpenAI from "openai";

import { env } from "../../config/env";
import { sendFollowUpNotificationById } from "../../lib/followup-notifier";
import { prisma } from "../../lib/prisma";
import { AuthUser } from "../../types/auth";

export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function projectsWhereForUser(user: AuthUser) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return {};
  }
  if (user.role === UserRole.REGIONAL_MANAGER) {
    return { manager: { regionalManagerId: user.id } };
  }
  if (user.role === UserRole.MANAGER) {
    return { managerId: user.id };
  }
  return { salesRepIds: { has: user.id } };
}

function followUpsWhereForUser(user: AuthUser) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return {};
  }
  if (user.role === UserRole.REGIONAL_MANAGER) {
    return {
      OR: [{ ownerId: user.id }, { project: { manager: { regionalManagerId: user.id } } }],
    };
  }
  if (user.role === UserRole.MANAGER) {
    return {
      OR: [{ ownerId: user.id }, { project: { managerId: user.id } }],
    };
  }
  return {
    OR: [{ ownerId: user.id }, { project: { salesRepIds: { has: user.id } } }],
  };
}

function activitiesWhereForUser(user: AuthUser) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.CEO) {
    return {};
  }
  if (user.role === UserRole.REGIONAL_MANAGER) {
    return {
      OR: [{ createdById: user.id }, { project: { manager: { regionalManagerId: user.id } } }],
    };
  }
  if (user.role === UserRole.MANAGER) {
    return {
      OR: [{ createdById: user.id }, { project: { managerId: user.id } }],
    };
  }
  return {
    OR: [{ createdById: user.id }, { project: { salesRepIds: { has: user.id } } }],
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeActivityCommand(question: string) {
  const q = question.toLowerCase();
  return (
    /(create|crate|add|log|post|record)\s+.*\b(activity|update|visit|call|email|whatsapp|stage|note)\b/.test(q) ||
    /\b(log|record)\b.*\b(for|on)\b.*\b(project)\b/.test(q)
  );
}

function looksLikeActivityEditCommand(question: string) {
  const q = question.toLowerCase();
  return /\b(edit|update|change|modify)\b.*\b(activity|update|note|visit|call|email|whatsapp)\b/.test(q);
}

function looksLikeFollowUpCreateCommand(question: string) {
  const q = question.toLowerCase();
  return /\b(create|crate|add|schedule|set|log)\b.*\b(follow[\s-]?up|followup)\b/.test(q);
}

function looksLikeFollowUpEditCommand(question: string) {
  const q = question.toLowerCase();
  return /\b(edit|update|change|modify|reschedule)\b.*\b(follow[\s-]?up|followup)\b/.test(q);
}

function detectActivityType(question: string): "note" | "call" | "visit" | "email" | "whatsapp" | "stage" {
  const q = question.toLowerCase();
  if (q.includes("whatsapp")) return "whatsapp";
  if (q.includes("visit")) return "visit";
  if (q.includes("email")) return "email";
  if (q.includes("call")) return "call";
  if (q.includes("stage")) return "stage";
  return "note";
}

function extractActivityMessage(question: string, matchedProjectName: string) {
  const colonIndex = question.indexOf(":");
  if (colonIndex >= 0 && colonIndex < question.length - 1) {
    return question.slice(colonIndex + 1).trim();
  }

  let cleaned = question;
  const patterns = [
    /\b(please|kindly)\b/gi,
    /\b(create|crate|add|log|post|record)\b/gi,
    /\b(activity|update|note|visit|call|email|whatsapp|stage)\b/gi,
    /\b(for|on)\s+project\b/gi,
    /\b(for|on)\b/gi,
  ];
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, " ");
  }
  cleaned = cleaned.replace(new RegExp(matchedProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function extractAfterColonOrTo(question: string) {
  const colonIndex = question.indexOf(":");
  if (colonIndex >= 0 && colonIndex < question.length - 1) {
    return question.slice(colonIndex + 1).trim();
  }
  const toMatch = question.match(/\bto\b\s+(.+)$/i);
  if (toMatch?.[1]) return toMatch[1].trim();
  return "";
}

function detectFollowUpChannel(question: string): "Call" | "Visit" | "WhatsApp" | "Email" | "Meeting" {
  const q = question.toLowerCase();
  if (q.includes("whatsapp")) return "WhatsApp";
  if (q.includes("email")) return "Email";
  if (q.includes("visit")) return "Visit";
  if (q.includes("meeting")) return "Meeting";
  return "Call";
}

function parseDueAt(question: string): Date | null {
  const q = question.toLowerCase();
  const now = new Date();

  if (q.includes("today")) {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }
  if (q.includes("tomorrow")) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const inDaysMatch = q.match(/\bin\s+(\d+)\s+day/);
  if (inDaysMatch?.[1]) {
    const days = Number(inDaysMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }

  const isoMatch = question.match(/\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?\b/);
  if (isoMatch) {
    const value = isoMatch[2] ? `${isoMatch[1]}T${isoMatch[2]}:00` : `${isoMatch[1]}T10:00:00`;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const dmyMatch = question.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}))?\b/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yyyy = dmyMatch[3];
    const hhmm = dmyMatch[4] ?? "10:00";
    const parsed = new Date(`${yyyy}-${mm}-${dd}T${hhmm}:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function parseFollowUpContact(question: string) {
  const explicit = question.match(/\bcontact\s*[:\-]\s*([a-zA-Z][a-zA-Z\s.'-]{1,80})/i);
  if (explicit?.[1]) return explicit[1].trim();
  return "Project Contact";
}

function parseFollowUpContactRole(question: string) {
  const explicit = question.match(/\brole\s*[:\-]\s*([a-zA-Z][a-zA-Z\s&/'-]{1,80})/i);
  if (explicit?.[1]) return explicit[1].trim();
  return "Stakeholder";
}

function findBestProjectMatch(
  question: string,
  projects: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  const normalizedQuestion = normalizeText(question);
  const direct = projects.find((project) => normalizedQuestion.includes(normalizeText(project.name)));
  if (direct) return direct;

  const queryTokens = new Set(normalizedQuestion.split(" ").filter((token) => token.length > 2));
  let best: { id: string; name: string } | null = null;
  let bestScore = 0;

  for (const project of projects) {
    const projectTokens = normalizeText(project.name).split(" ").filter((token) => token.length > 2);
    if (projectTokens.length === 0) continue;
    const score = projectTokens.filter((token) => queryTokens.has(token)).length;
    if (score > bestScore) {
      bestScore = score;
      best = project;
    }
  }

  return bestScore >= 2 ? best : null;
}

async function tryCreateActivityFromQuestion(input: { user: AuthUser; question: string }) {
  if (!looksLikeActivityCommand(input.question)) return null;

  const accessibleProjects = await prisma.project.findMany({
    where: projectsWhereForUser(input.user),
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { id: true, name: true },
  });

  const matchedProject = findBestProjectMatch(input.question, accessibleProjects);
  if (!matchedProject) {
    return "I could not find a matching accessible project for this activity. Mention the exact project name.";
  }

  const message = extractActivityMessage(input.question, matchedProject.name);
  if (!message) {
    return `Please include the activity message. Example: "Log visit for ${matchedProject.name}: Met consultant and discussed facade options."`;
  }

  const type = detectActivityType(input.question);
  const userProfile = await prisma.user.findUnique({
    where: { id: input.user.id },
    select: { firstName: true, lastName: true },
  });
  const createdByName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : null;

  await prisma.projectActivity.create({
    data: {
      projectId: matchedProject.id,
      type,
      message,
      visitWhatHappened: type === "visit" ? message : undefined,
      createdById: input.user.id,
      createdByName,
    },
  });

  return `Activity logged successfully for ${matchedProject.name} (${type}).`;
}

async function tryEditActivityFromQuestion(input: { user: AuthUser; question: string }) {
  if (!looksLikeActivityEditCommand(input.question)) return null;

  const accessibleProjects = await prisma.project.findMany({
    where: projectsWhereForUser(input.user),
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { id: true, name: true },
  });
  const matchedProject = findBestProjectMatch(input.question, accessibleProjects);
  if (!matchedProject) {
    return "I could not find the project for this activity update. Mention the exact project name.";
  }

  const existing = await prisma.projectActivity.findFirst({
    where: {
      projectId: matchedProject.id,
      createdById: input.user.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true },
  });
  if (!existing) {
    return `I could not find any activity created by you in ${matchedProject.name} to edit.`;
  }

  const message = extractAfterColonOrTo(input.question);
  if (!message) {
    return `Please provide updated activity text after a colon. Example: "Edit activity for ${matchedProject.name}: Met consultant and shared revised BOQ."`;
  }
  const type = detectActivityType(input.question);
  const nextType = input.question.toLowerCase().includes("activity") ? existing.type : type;

  await prisma.projectActivity.update({
    where: { id: existing.id },
    data: {
      type: nextType,
      message,
      visitWhatHappened: nextType === "visit" ? message : null,
    },
  });

  return `Activity updated successfully for ${matchedProject.name}.`;
}

async function tryCreateFollowUpFromQuestion(input: { user: AuthUser; question: string }) {
  if (!looksLikeFollowUpCreateCommand(input.question)) return null;

  const accessibleProjects = await prisma.project.findMany({
    where: projectsWhereForUser(input.user),
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { id: true, name: true },
  });
  const matchedProject = findBestProjectMatch(input.question, accessibleProjects);
  if (!matchedProject) {
    return "I could not find a matching accessible project for this follow-up. Mention the exact project name.";
  }

  const dueAt = parseDueAt(input.question);
  if (!dueAt) {
    return `Please include follow-up due date (e.g. "tomorrow", "in 2 days", or "2026-06-10 14:00").`;
  }

  const note = extractAfterColonOrTo(input.question) || "Follow-up scheduled from AI assistant.";
  const channel = detectFollowUpChannel(input.question);
  const contact = parseFollowUpContact(input.question);
  const contactRole = parseFollowUpContactRole(input.question);
  const status = dueAt.getTime() < Date.now() ? "Overdue" : "Upcoming";

  const createdFollowUp = await prisma.followUp.create({
    data: {
      projectId: matchedProject.id,
      ownerId: input.user.id,
      contact,
      contactRole,
      dueAt,
      channel,
      status,
      note,
    },
  });
  void sendFollowUpNotificationById({
    followUpId: createdFollowUp.id,
    action: "created",
    actorName: input.user.email,
  }).catch(() => undefined);

  return `Follow-up created for ${matchedProject.name} (${channel}) due ${dueAt.toLocaleString("en-AE")}.`;
}

async function tryEditFollowUpFromQuestion(input: { user: AuthUser; question: string }) {
  if (!looksLikeFollowUpEditCommand(input.question)) return null;

  const accessibleProjects = await prisma.project.findMany({
    where: projectsWhereForUser(input.user),
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { id: true, name: true },
  });
  const matchedProject = findBestProjectMatch(input.question, accessibleProjects);
  if (!matchedProject) {
    return "I could not find the project for this follow-up update. Mention the exact project name.";
  }

  const existing = await prisma.followUp.findFirst({
    where: {
      projectId: matchedProject.id,
      ...(input.user.role === UserRole.ADMIN || input.user.role === UserRole.CEO ? {} : { ownerId: input.user.id }),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, dueAt: true, channel: true, note: true },
  });
  if (!existing) {
    return `I could not find a follow-up you can edit for ${matchedProject.name}.`;
  }

  const dueAt = parseDueAt(input.question);
  const note = extractAfterColonOrTo(input.question);
  const nextChannel = detectFollowUpChannel(input.question);
  const q = input.question.toLowerCase();
  const shouldChangeChannel =
    q.includes("call") || q.includes("visit") || q.includes("whatsapp") || q.includes("email") || q.includes("meeting");

  if (!dueAt && !note && !shouldChangeChannel) {
    return `Please provide what to change (date/channel/note). Example: "Update follow-up for ${matchedProject.name} to tomorrow 11:00: call consultant".`;
  }

  const finalDueAt = dueAt ?? existing.dueAt;
  const status = finalDueAt.getTime() < Date.now() ? "Overdue" : "Upcoming";

  const updatedFollowUp = await prisma.followUp.update({
    where: { id: existing.id },
    data: {
      dueAt: finalDueAt,
      channel: shouldChangeChannel ? nextChannel : existing.channel,
      note: note || existing.note,
      status,
    },
  });
  void sendFollowUpNotificationById({
    followUpId: updatedFollowUp.id,
    action: "updated",
    actorName: input.user.email,
  }).catch(() => undefined);

  return `Follow-up updated successfully for ${matchedProject.name}.`;
}

export async function generateAssistantResponse(input: {
  user: AuthUser;
  question: string;
  history: AssistantHistoryMessage[];
}): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const actionResponse = await tryCreateActivityFromQuestion({
    user: input.user,
    question: input.question,
  });
  if (actionResponse) {
    return actionResponse;
  }

  const activityEditResponse = await tryEditActivityFromQuestion({
    user: input.user,
    question: input.question,
  });
  if (activityEditResponse) {
    return activityEditResponse;
  }

  const followUpCreateResponse = await tryCreateFollowUpFromQuestion({
    user: input.user,
    question: input.question,
  });
  if (followUpCreateResponse) {
    return followUpCreateResponse;
  }

  const followUpEditResponse = await tryEditFollowUpFromQuestion({
    user: input.user,
    question: input.question,
  });
  if (followUpEditResponse) {
    return followUpEditResponse;
  }

  const [projects, followUps, activities] = await Promise.all([
    prisma.project.findMany({
      where: projectsWhereForUser(input.user),
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        name: true,
        stage: true,
        valueAed: true,
        probability: true,
        daysInStage: true,
        managerName: true,
        salesRepNames: true,
        city: true,
        country: true,
        updatedAt: true,
      },
    }),
    prisma.followUp.findMany({
      where: followUpsWhereForUser(input.user),
      orderBy: { dueAt: "asc" },
      take: 40,
      select: {
        id: true,
        projectId: true,
        contact: true,
        contactRole: true,
        dueAt: true,
        channel: true,
        status: true,
        note: true,
        ownerId: true,
        project: { select: { name: true, managerName: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.projectActivity.findMany({
      where: activitiesWhereForUser(input.user),
      orderBy: { createdAt: "desc" },
      take: 35,
      select: {
        id: true,
        projectId: true,
        type: true,
        message: true,
        createdByName: true,
        createdAt: true,
        project: { select: { name: true, stage: true } },
      },
    }),
  ]);

  const stageBreakdown = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.stage] = (acc[project.stage] ?? 0) + 1;
    return acc;
  }, {});

  const context = {
    access: {
      role: input.user.role,
      userId: input.user.id,
      scope:
        input.user.role === UserRole.ADMIN || input.user.role === UserRole.CEO
          ? "global"
          : input.user.role === UserRole.REGIONAL_MANAGER
            ? "regional manager scope (their managers + reps)"
          : input.user.role === UserRole.MANAGER
            ? "manager-owned projects + related follow-ups/activities"
            : "assigned projects + owned follow-ups/activities",
    },
    metrics: {
      totalProjects: projects.length,
      totalFollowUps: followUps.length,
      followUpStatusBreakdown: followUps.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {}),
      totalRecentActivities: activities.length,
      projectStageBreakdown: stageBreakdown,
    },
    projects,
    followUps,
    activities,
  };

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are Alubond CRM Assistant. Answer only from provided CRM context. " +
          "If data is unavailable in context, say clearly what is missing. " +
          "Be concise, operational, and include numbers/status where possible.",
      },
      {
        role: "system",
        content: `CRM Context (JSON):\n${JSON.stringify(context)}`,
      },
      ...input.history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: input.question,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "I could not generate a response right now.";
}

