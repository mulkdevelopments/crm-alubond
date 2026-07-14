import { parseAssistantMessage, type AssistantInline } from '@/lib/assistant-message';

function InlineText({ segments, className }: { segments: AssistantInline[]; className?: string }) {
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === 'bold' ? (
          <strong key={`${segment.text}-${index}`} className="font-semibold">
            {segment.text}
          </strong>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

export function AssistantMessageBody({
  content,
  tone = 'assistant',
}: {
  content: string;
  tone?: 'assistant' | 'user';
}) {
  if (tone === 'user') {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  const blocks = parseAssistantMessage(content);
  const fields = blocks.filter((block) => block.type === 'field');
  const others = blocks.filter((block) => block.type !== 'field');

  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed break-words">
      {others.map((block, index) => {
        if (block.type === 'title') {
          return (
            <p key={`title-${index}`} className="text-sm font-semibold tracking-tight text-[var(--text)]">
              <InlineText segments={block.segments} />
            </p>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={`bullet-${index}`} className="flex gap-2 text-[var(--text)]">
              <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600/80" />
              <InlineText segments={block.segments} className="min-w-0" />
            </div>
          );
        }
        return (
          <p key={`p-${index}`} className="text-[var(--text)]">
            <InlineText segments={block.segments} />
          </p>
        );
      })}

      {fields.length > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 overflow-hidden">
          {fields.map((block, index) =>
            block.type === 'field' ? (
              <div
                key={`field-${block.label}-${index}`}
                className={`grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-3 px-3 py-2 ${
                  index > 0 ? 'border-t border-[var(--border)]' : ''
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-3 pt-0.5">
                  {block.label}
                </span>
                <InlineText segments={block.segments} className="text-[13px] text-[var(--text)]" />
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
