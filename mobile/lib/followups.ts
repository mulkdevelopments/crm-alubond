import type { ApiFollowUp, FollowUpChannel, FollowUpStatus } from "@/lib/api/followups-api";

export function deriveStatus(followUp: ApiFollowUp): FollowUpStatus {
  if (followUp.status === "Done") return "Done";
  return computeStatusFromDueDate(followUp.dueAt);
}

export function computeStatusFromDueDate(dueAt: string): FollowUpStatus {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "Upcoming";
  if (due < now) return "Overdue";
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
  if (due <= endOfToday) return "Due today";
  return "Upcoming";
}

export function relativeDueTime(date: string) {
  const diffMs = new Date(date).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < hr) return rtf.format(Math.round(diffMs / min), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hr), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), "day");
  if (abs < 365 * day) return rtf.format(Math.round(diffMs / (30 * day)), "month");
  return rtf.format(Math.round(diffMs / (365 * day)), "year");
}

export function parseFollowUpNote(note: string) {
  const lines = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let phone: string | null = null;
  let email: string | null = null;
  let location: string | null = null;
  let meetingWith: string | null = null;
  let meetingTime: string | null = null;
  const contentLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    const phoneMatch = line.match(/^Phone:\s*(.+)$/i);
    if (phoneMatch) {
      phone = phoneMatch[1].trim();
      continue;
    }
    const emailMatch = line.match(/^Email:\s*(.+)$/i);
    if (emailMatch) {
      email = emailMatch[1].trim();
      continue;
    }
    const locationMatch = line.match(/^Location:\s*(.+)$/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
      continue;
    }
    const meetingWithMatch = line.match(/^Meeting with:\s*(.+)$/i);
    if (meetingWithMatch) {
      meetingWith = meetingWithMatch[1].trim();
      continue;
    }
    const meetingTimeMatch = line.match(/^Meeting time:\s*(.+)$/i);
    if (meetingTimeMatch) {
      meetingTime = meetingTimeMatch[1].trim();
      continue;
    }
    if (contentLines.length === 0) {
      contentLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  return {
    summary: contentLines[0] ?? note,
    phone,
    email,
    location,
    meetingWith,
    meetingTime,
    otherLines,
  };
}

export function toWhatsAppPhone(phone: string | null) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

export function buildFollowUpInsights(items: ApiFollowUp[]) {
  const active = items.filter((item) => item.status !== "Done");
  const done = items.filter((item) => item.status === "Done");
  const total = items.length;
  const completionRate = total === 0 ? 0 : Math.round((done.length / total) * 100);

  const channelOrder: FollowUpChannel[] = ["Call", "Visit", "WhatsApp", "Email", "Meeting"];
  const channelMap = new Map<FollowUpChannel, number>(channelOrder.map((entry) => [entry, 0]));
  for (const item of active) {
    channelMap.set(item.channel, (channelMap.get(item.channel) ?? 0) + 1);
  }
  const channels = channelOrder.map((entry) => ({ channel: entry, count: channelMap.get(entry) ?? 0 }));

  const ownerMap = new Map<string, number>();
  for (const item of active) {
    const owner = item.ownerName?.trim() || "Unassigned";
    ownerMap.set(owner, (ownerMap.get(owner) ?? 0) + 1);
  }
  const owners = Array.from(ownerMap.entries())
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const nextDue =
    [...active]
      .filter((item) => Number.isFinite(new Date(item.dueAt).getTime()))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0] ?? null;

  return {
    total,
    activeCount: active.length,
    doneCount: done.length,
    completionRate,
    channels,
    owners,
    nextDue,
  };
}

export function groupFollowUps(items: ApiFollowUp[]) {
  const active = items.filter((item) => item.status !== "Done");
  const done = items.filter((item) => item.status === "Done");
  return {
    overdue: active.filter((item) => deriveStatus(item) === "Overdue"),
    today: active.filter((item) => deriveStatus(item) === "Due today"),
    upcoming: active.filter((item) => deriveStatus(item) === "Upcoming"),
    done,
  };
}
