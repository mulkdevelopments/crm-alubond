'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  Mic,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { aiInsights } from '@/lib/data';
import { cn } from '@/lib/utils';

const PROMPTS = [
  'Summarize the pipeline health this week',
  'Which deals are most at risk of slipping next month?',
  'Draft a follow-up WhatsApp to Eng. Saeed for the Burj Binghatti deal',
  'Compare our win rate vs Reynobond in the last 6 months',
  'Generate a CEO weekly summary',
];

const CONVERSATION = [
  {
    role: 'user' as const,
    text: 'What patterns are driving lost deals over AED 2M?',
  },
  {
    role: 'ai' as const,
    text: `4 of 6 lost deals over **AED 2M** in the past 90 days share a strong signal: **≥ 14 days without a consultant touchpoint** before the loss. Two more patterns showed up:`,
    bullets: [
      'When **Reynobond** appears as a competitor on WSP-led specs, our close rate drops from 41% to 18%.',
      'Deals where **fire-rating proof** wasn\'t shared in the first 21 days were lost 3× more often.',
      'Karim has the fastest recovery rate (avg 6h response); Vikram\'s lag (avg 38h) correlates with 2 of the 6 losses.',
    ],
    actions: [
      'Enforce 7-day consultant SLA on AED 2M+ deals',
      'Auto-attach BS 8414 report on first WSP touchpoint',
      'Pair Vikram with Karim for shadow week',
    ],
    impact: '+18% projected win-rate uplift',
  },
];

export default function AIPage() {
  const [input, setInput] = useState('');

  return (
    <>
      <PageHeader
        eyebrow="AI Sales Assistant"
        title={<>Ask anything. Get sales intelligence in seconds.</>}
        subtitle="Powered by your CRM data — projects, follow-ups, competitor patterns, weather forecasts, mega-tender feeds, and your team's voice notes."
        actions={<Badge tone="brand"><Sparkles className="h-3 w-3" /> GPT-4o · Live</Badge>}
      />

      <div className="px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-4">
        <div className="space-y-4">
          {/* Insights row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiInsights.map((insight, i) => {
              const tones = {
                high: 'border-rose-500/30 bg-rose-500/5',
                medium: 'border-amber-500/30 bg-amber-500/5',
                low: 'border-emerald-500/30 bg-emerald-500/5',
              };
              return (
                <Card key={i} className={cn('p-5 border', tones[insight.severity])}>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                      {insight.severity === 'high' ? <TrendingDown className="h-4 w-4 text-rose-600" /> : <TrendingUp className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-3 font-semibold">{insight.severity === 'high' ? 'Critical' : insight.severity === 'medium' ? 'Watch' : 'Healthy'}</p>
                      <h4 className="text-sm font-semibold tracking-tight mt-0.5 leading-snug">{insight.title}</h4>
                      <p className="text-xs text-2 mt-1.5 leading-relaxed">{insight.body}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone={insight.severity === 'high' ? 'danger' : insight.severity === 'medium' ? 'warning' : 'success'}>{insight.metric}</Badge>
                        <button className="text-xs font-medium text-brand-600 inline-flex items-center gap-1 hover:underline">
                          Investigate <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Conversation */}
          <Card>
            <CardHeader
              title={<span className="inline-flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-brand-600" /> AI conversation</span>}
              subtitle="Trained on your last 12 months of projects, contacts, follow-ups and outcomes"
            />
            <div className="px-5 pb-3 space-y-4">
              {CONVERSATION.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                  {msg.role === 'ai' ? (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-brand-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar name="Karim Mansour" size="sm" />
                  )}
                  <div className={cn('flex-1 max-w-[85%]', msg.role === 'user' && 'text-right')}>
                    {msg.role === 'user' ? (
                      <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tr-md bg-brand-600 text-white text-sm">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm leading-relaxed text-2" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, '<b class="text-[var(--text)]">$1</b>') }} />
                        {msg.bullets && (
                          <ul className="space-y-1.5 text-sm pl-1">
                            {msg.bullets.map((b, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                                <span className="text-2" dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.+?)\*\*/g, '<b class="text-[var(--text)]">$1</b>') }} />
                              </li>
                            ))}
                          </ul>
                        )}
                        {msg.actions && (
                          <div className="mt-3 p-4 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
                            <p className="text-[11px] uppercase tracking-widest text-3 font-semibold mb-2 inline-flex items-center gap-1.5"><Zap className="h-3 w-3" /> Recommended actions</p>
                            <ul className="space-y-1.5 text-sm">
                              {msg.actions.map((a, j) => (
                                <li key={j} className="flex items-center justify-between gap-3 group">
                                  <span className="text-2">{a}</span>
                                  <button className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="h-3.5 w-3.5" /></button>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                              <span className="text-[11px] text-3">Projected impact</span>
                              <Badge tone="success">{msg.impact}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 pb-5 pt-3 border-t border-[var(--border)]">
              <div className="flex items-end gap-2 p-2 rounded-2xl bg-[var(--surface-2)] border border-transparent focus-within:border-[var(--border-strong)] focus-within:bg-[var(--surface)] transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about pipeline, competitors, follow-ups, or draft a message…"
                  rows={2}
                  className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-1.5 placeholder:text-3"
                />
                <Button variant="ghost" size="sm" className="!h-8 !w-8 !p-0"><Mic className="h-4 w-4" /></Button>
                <Button variant="primary" size="sm" className="!h-8 !w-8 !p-0"><Send className="h-4 w-4" /></Button>
              </div>
              <p className="text-[10px] text-3 mt-2">AI responses are grounded in your live CRM data. Confidential.</p>
            </div>
          </Card>
        </div>

        {/* Right rail - suggested prompts */}
        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Try asking</h3>
            <p className="text-xs text-3 mt-0.5">Tap to send</p>
            <ul className="mt-4 space-y-1.5">
              {PROMPTS.map((p, i) => (
                <li key={i}>
                  <button className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-[var(--surface-2)] transition-colors group flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-brand-600 mt-0.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    <span className="text-2 leading-snug">{p}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-violet-600 to-brand-700 text-white border-0 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <BrainCircuit className="h-5 w-5 mb-3 relative" />
            <h3 className="text-base font-semibold tracking-tight relative">Weekly CEO summary</h3>
            <p className="text-xs opacity-80 mt-1 mb-4 relative">7-day pipeline movement, competitor heat, risk drivers — generated every Sunday 8pm.</p>
            <Button variant="secondary" size="sm" className="!bg-white !text-brand-700 !border-0 hover:!bg-white/90 w-full" icon={<ArrowUpRight className="h-4 w-4" />}>
              Read last summary
            </Button>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">Data sources</h3>
            <ul className="mt-3 space-y-2 text-xs">
              {[
                ['Pipeline', '26 projects'],
                ['Contacts', '184 stakeholders'],
                ['Activities', '1,420 in 90d'],
                ['Voice notes', '94 transcribed'],
                ['Competitor intel', '32 mentions'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between border-b border-[var(--border)] py-1.5 last:border-0">
                  <span className="text-2">{k}</span>
                  <span className="font-semibold num-tabular">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
