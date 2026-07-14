export type AssistantInline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string };

export type AssistantBlock =
  | { type: "title"; segments: AssistantInline[] }
  | { type: "paragraph"; segments: AssistantInline[] }
  | { type: "bullet"; segments: AssistantInline[] }
  | { type: "field"; label: string; segments: AssistantInline[] };

const ISO_DATE_RE = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\b/g;
const FIELD_LINE_RE = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/;
const BULLET_RE = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/;

export function humanizeAssistantDates(text: string) {
  return text.replace(ISO_DATE_RE, (raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  });
}

export function parseInlineMarkdown(text: string): AssistantInline[] {
  const segments: AssistantInline[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "bold", text: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: "text", text }];
}

function stripCodeFences(text: string) {
  return text
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

export function parseAssistantMessage(content: string): AssistantBlock[] {
  const normalized = humanizeAssistantDates(stripCodeFences(content)).replace(/\r\n/g, "\n").trim();
  if (!normalized) return [{ type: "paragraph", segments: [{ type: "text", text: "" }] }];

  const lines = normalized.split("\n");
  const blocks: AssistantBlock[] = [];
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    paragraphBuffer = [];
    if (!text) return;
    blocks.push({ type: "paragraph", segments: parseInlineMarkdown(text) });
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      return;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      flushParagraph();
      const body = bulletMatch[1].trim();
      const fieldMatch = body.match(FIELD_LINE_RE);
      if (fieldMatch) {
        blocks.push({
          type: "field",
          label: fieldMatch[1].replace(/:$/, "").trim(),
          segments: parseInlineMarkdown(fieldMatch[2].trim()),
        });
        return;
      }
      blocks.push({ type: "bullet", segments: parseInlineMarkdown(body) });
      return;
    }

    const fieldMatch = line.match(FIELD_LINE_RE);
    if (fieldMatch) {
      flushParagraph();
      blocks.push({
        type: "field",
        label: fieldMatch[1].replace(/:$/, "").trim(),
        segments: parseInlineMarkdown(fieldMatch[2].trim()),
      });
      return;
    }

    if (blocks.length === 0 && paragraphBuffer.length === 0 && line.length <= 90) {
      blocks.push({
        type: "title",
        segments: parseInlineMarkdown(line.replace(/^#+\s*/, "").replace(/:$/, "")),
      });
      return;
    }

    paragraphBuffer.push(line.replace(/^#+\s*/, ""));
    if (index === lines.length - 1) flushParagraph();
  });

  flushParagraph();
  return blocks;
}
