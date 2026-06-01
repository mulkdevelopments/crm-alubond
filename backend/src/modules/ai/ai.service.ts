import { UserRole } from "@prisma/client";
import OpenAI from "openai";

import { env } from "../../config/env";
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
    /(create|add|log|post|record)\s+.*\b(activity|update|visit|call|email|whatsapp|stage|note)\b/.test(q) ||
    /\b(log|record)\b.*\b(for|on)\b.*\b(project)\b/.test(q)
  );
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
    /\b(create|add|log|post|record)\b/gi,
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

