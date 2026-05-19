import { Download, FileBadge, FileCheck2, FileSpreadsheet, FileText, Plus, Stamp, Shield } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { projects } from '@/lib/data';
import { formatAED } from '@/lib/utils';

type DocType = 'Quotation' | 'Technical Submittal' | 'Sample Request' | 'Datasheet' | 'Warranty Letter' | 'Method Statement';

const DOC_ICONS: Record<DocType, React.ReactNode> = {
  Quotation: <FileSpreadsheet className="h-4 w-4" />,
  'Technical Submittal': <FileBadge className="h-4 w-4" />,
  'Sample Request': <FileCheck2 className="h-4 w-4" />,
  Datasheet: <FileText className="h-4 w-4" />,
  'Warranty Letter': <Shield className="h-4 w-4" />,
  'Method Statement': <Stamp className="h-4 w-4" />,
};

const docs = projects.slice(0, 10).flatMap((p, i) => {
  const types: DocType[] = ['Quotation', 'Technical Submittal', 'Sample Request', 'Datasheet', 'Warranty Letter', 'Method Statement'];
  const docCount = (i % 3) + 1;
  return Array.from({ length: docCount }, (_, j) => ({
    id: `D-${3000 + i * 5 + j}`,
    type: types[(i + j) % types.length],
    version: j + 1,
    project: p,
    issuedAt: new Date(Date.now() - (i + 1) * 86400_000 - j * 3600_000).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' }),
    status: j === 0 ? 'Issued' : j === 1 ? 'Approved' : 'Draft',
    by: p.owner,
  }));
});

export default function QuotationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Quotations & submittals"
        subtitle="Every document linked to its project timeline. Generate, version, share — track approvals."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />}>Export</Button>
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>New document</Button>
          </>
        }
      />

      <section className="px-4 lg:px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {(Object.keys(DOC_ICONS) as DocType[]).map((t) => (
          <Card key={t} className="p-4">
            <div className="h-9 w-9 rounded-xl bg-brand-600/10 text-brand-600 flex items-center justify-center mb-3">{DOC_ICONS[t]}</div>
            <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{t}</p>
            <p className="mt-1 text-xl font-bold tracking-tight num-tabular">{docs.filter((d) => d.type === t).length}</p>
          </Card>
        ))}
      </section>

      <section className="px-4 lg:px-8">
        <Card>
          <CardHeader title="Recent documents" subtitle="Sorted by issue date" />
          <ul className="divide-y divide-[var(--border)]">
            {docs.slice(0, 12).map((d) => {
              const tone = d.status === 'Approved' ? 'success' : d.status === 'Issued' ? 'info' : 'warning';
              return (
                <li key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--surface-2)]/60 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-2 shrink-0">{DOC_ICONS[d.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold tracking-tight truncate">{d.type} <span className="text-3 font-normal">v{d.version}</span></p>
                      <Badge tone={tone}>{d.status}</Badge>
                    </div>
                    <p className="text-xs text-3 truncate mt-0.5">{d.project.name} · {formatAED(d.project.value, true)}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <Avatar name={d.by} size="xs" />
                    <span className="text-xs text-2">{d.by.split(' ')[0]}</span>
                  </div>
                  <span className="text-[11px] text-3 num-tabular shrink-0 w-16 text-right">{d.issuedAt}</span>
                  <Button variant="ghost" size="sm" className="!h-8 !w-8 !p-0"><Download className="h-3.5 w-3.5" /></Button>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </>
  );
}
