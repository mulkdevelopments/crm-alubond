export default function DocsPage() {
  return (
    <div className="h-[calc(100dvh-4rem-5.5rem)] lg:h-[calc(100dvh-4rem-1.5rem)]">
      <iframe
        src="/docs/user-guide/index.html"
        title="Alubond CRM User Guide"
        className="h-full w-full border-0 bg-[var(--surface)]"
      />
    </div>
  );
}
