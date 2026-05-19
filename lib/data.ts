export type Stage =
  | 'Lead Identified'
  | 'Consultant Contacted'
  | 'Specification'
  | 'Sample Submitted'
  | 'Tender'
  | 'Negotiation'
  | 'Approved'
  | 'PO Expected'
  | 'Won'
  | 'Lost';

export const STAGES: Stage[] = [
  'Lead Identified',
  'Consultant Contacted',
  'Specification',
  'Sample Submitted',
  'Tender',
  'Negotiation',
  'Approved',
  'PO Expected',
];

export const STAGE_TONES: Record<Stage, string> = {
  'Lead Identified': 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  'Consultant Contacted': 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Specification: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  'Sample Submitted': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Tender: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  Approved: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'PO Expected': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Won: 'bg-emerald-600 text-white',
  Lost: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

export type Project = {
  id: string;
  name: string;
  city: string;
  country: 'UAE' | 'KSA' | 'Qatar' | 'Oman';
  lat: number;
  lng: number;
  value: number; // AED
  quantitySqm: number;
  product: 'A2 FR' | 'PVDF Standard' | 'FR Core' | 'Mirror Finish' | 'Wood Grain';
  fireRating: 'A2' | 'B1' | 'FR' | 'Standard';
  stage: Stage;
  probability: number;
  expectedOrder: string; // ISO
  marginPct: number;
  architect: string;
  consultant: string;
  contractor: string;
  fabricator: string;
  developer: string;
  decisionMaker: string;
  owner: string;
  competitor: string | null;
  lastUpdate: string;
  daysInStage: number;
  lossReason?: string;
  aging: number; // days
  sampleSubmitted: boolean;
  specStatus: 'Open' | 'Specified' | 'Approved Equal' | 'Rejected';
};

const owners = ['Karim Mansour', 'Aisha Al Mazrouei', 'Vikram Shenoy', 'Layla Haddad', 'Omar Bashir'];
const architects = [
  'Atkins Acuity',
  'Gensler MENA',
  'Killa Design',
  'Dewan Architects',
  'AE7',
  'RMJM Dubai',
  'Godwin Austen Johnson',
  'X Architects',
  'U+A Architecture',
  'Perkins+Will',
];
const consultants = [
  'WSP Middle East',
  'AECOM',
  'Hyder Consulting',
  'Mott MacDonald',
  'KEO International',
  'Parsons',
  'Dar Al Handasah',
  'WME Consultants',
];
const contractors = [
  'ALEC Engineering',
  'ASGC',
  'Khansaheb Civil',
  'Arabtec',
  'Al Futtaim Carillion',
  'Shapoorji Pallonji',
  'BAM International',
  'Six Construct',
  'TRENDS',
  'Al Naboodah Construction',
];
const fabricators = [
  'Folcra Beach Industrial',
  'Alumco',
  'Mac Al Gurg',
  'Permasteelisa Gulf',
  'Saudi Diyar',
  'Architectural Aluminium',
  'Emirates Glass',
  'Tameer Steel',
];
const developers = [
  'Emaar Properties',
  'Aldar Properties',
  'DAMAC',
  'Meraas',
  'Nakheel',
  'Diriyah Gate',
  'NEOM',
  'Qatari Diar',
  'Omran',
];
const competitors = ['Alpolic', 'Reynobond', 'Larson', 'Alucobond', 'Vitrabond', null, null];
const lossReasons = [
  'Price too high',
  'Consultant preference',
  'Competitor relationship',
  'Delayed follow-up',
  'Certification issue',
  'Delivery concern',
  'No fabricator relationship',
];

const projectSeeds: Array<Partial<Project> & Pick<Project, 'name' | 'city' | 'lat' | 'lng' | 'country'>> = [
  { name: 'Dubai Creek Tower – Phase 2 Cladding', city: 'Dubai', country: 'UAE', lat: 25.1972, lng: 55.3441 },
  { name: 'Burj Binghatti Jacob & Co Residences', city: 'Dubai', country: 'UAE', lat: 25.1864, lng: 55.2698 },
  { name: 'Sobha Hartland Waves Opulence', city: 'Dubai', country: 'UAE', lat: 25.1740, lng: 55.3211 },
  { name: 'Aldar Saadiyat Grove Retail', city: 'Abu Dhabi', country: 'UAE', lat: 24.5333, lng: 54.4350 },
  { name: 'Yas Bay Arena Façade Refurbishment', city: 'Abu Dhabi', country: 'UAE', lat: 24.4729, lng: 54.6072 },
  { name: 'Sharjah Sustainable City – Plaza', city: 'Sharjah', country: 'UAE', lat: 25.2950, lng: 55.5750 },
  { name: 'NEOM The Line – Module 2A', city: 'Tabuk', country: 'KSA', lat: 27.5236, lng: 36.5694 },
  { name: 'Diriyah Gate Cultural District', city: 'Riyadh', country: 'KSA', lat: 24.7344, lng: 46.5750 },
  { name: 'Red Sea Project – Hotel Cluster 3', city: 'Tabuk', country: 'KSA', lat: 27.0822, lng: 35.6708 },
  { name: 'Lusail Marina Plaza Tower C', city: 'Lusail', country: 'Qatar', lat: 25.4341, lng: 51.4922 },
  { name: 'Msheireb Downtown Phase 4', city: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.5310 },
  { name: 'Muscat Hills Resort Expansion', city: 'Muscat', country: 'Oman', lat: 23.5880, lng: 58.3829 },
  { name: 'Sustainable City Yas Island', city: 'Abu Dhabi', country: 'UAE', lat: 24.4868, lng: 54.6075 },
  { name: 'Damac Lagoons Morocco Cluster', city: 'Dubai', country: 'UAE', lat: 25.0357, lng: 55.2079 },
  { name: 'Meraas Bluewaters Bay', city: 'Dubai', country: 'UAE', lat: 25.0795, lng: 55.1244 },
  { name: 'Etihad Rail HQ Cladding Package', city: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773 },
  { name: 'King Salman Park Pavilions', city: 'Riyadh', country: 'KSA', lat: 24.6816, lng: 46.6776 },
  { name: 'Jeddah Tower Lobby Refit', city: 'Jeddah', country: 'KSA', lat: 21.7253, lng: 39.0992 },
  { name: 'Wakra Stadium Renovation', city: 'Al Wakrah', country: 'Qatar', lat: 25.1715, lng: 51.6034 },
  { name: 'Ras Al Khaimah Marjan Resort', city: 'Ras Al Khaimah', country: 'UAE', lat: 25.6857, lng: 55.7460 },
  { name: 'AlUla Resort Cultural Pavilion', city: 'AlUla', country: 'KSA', lat: 26.6225, lng: 37.9163 },
  { name: 'Sodic East Sokhna Towers', city: 'Sharjah', country: 'UAE', lat: 25.3463, lng: 55.4209 },
  { name: 'Mohammed Bin Rashid City Mall', city: 'Dubai', country: 'UAE', lat: 25.1810, lng: 55.2950 },
  { name: 'Expo City Dubai – Innovation Hub', city: 'Dubai', country: 'UAE', lat: 24.9618, lng: 55.1469 },
  { name: 'Mina Rashid Cruise Terminal', city: 'Dubai', country: 'UAE', lat: 25.2750, lng: 55.2696 },
  { name: 'King Abdullah Financial District T8', city: 'Riyadh', country: 'KSA', lat: 24.7619, lng: 46.6427 },
];

const products: Project['product'][] = ['A2 FR', 'PVDF Standard', 'FR Core', 'Mirror Finish', 'Wood Grain'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const projects: Project[] = projectSeeds.map((seed, i) => {
  const h = hash(seed.name);
  const stageIdx = h % (STAGES.length + 2);
  const stage: Stage = stageIdx >= STAGES.length ? (stageIdx === STAGES.length ? 'Won' : 'Lost') : STAGES[stageIdx];
  const valueBase = [780_000, 1_200_000, 2_400_000, 4_800_000, 9_600_000, 18_000_000][h % 6];
  const value = valueBase + (h % 500_000);
  const qty = Math.round(value / (180 + (h % 80)));
  const probability =
    stage === 'Won' ? 100 : stage === 'Lost' ? 0 : Math.min(90, 10 + STAGES.indexOf(stage) * 10 + (h % 12));
  const days = (h % 60) + 4;
  const expected = new Date();
  expected.setDate(expected.getDate() + (h % 120) - 20);

  return {
    id: `P-${(1000 + i).toString()}`,
    name: seed.name,
    city: seed.city,
    country: seed.country,
    lat: seed.lat,
    lng: seed.lng,
    value,
    quantitySqm: qty,
    product: products[h % products.length],
    fireRating: (['A2', 'B1', 'FR', 'Standard'] as const)[h % 4],
    stage,
    probability,
    expectedOrder: expected.toISOString(),
    marginPct: 12 + (h % 18),
    architect: architects[h % architects.length],
    consultant: consultants[(h >> 3) % consultants.length],
    contractor: contractors[(h >> 5) % contractors.length],
    fabricator: fabricators[(h >> 7) % fabricators.length],
    developer: developers[(h >> 9) % developers.length],
    decisionMaker: ['Project Director', 'Procurement Head', 'Chief Architect', 'Façade Consultant'][(h >> 11) % 4],
    owner: owners[(h >> 4) % owners.length],
    competitor: competitors[h % competitors.length],
    lastUpdate: new Date(Date.now() - (days * 6 * 3600_000)).toISOString(),
    daysInStage: days,
    lossReason: stage === 'Lost' ? lossReasons[h % lossReasons.length] : undefined,
    aging: (h % 90) + 5,
    sampleSubmitted: stageIdx >= 3,
    specStatus: (['Open', 'Specified', 'Approved Equal', 'Rejected'] as const)[h % 4],
  };
});

export type FollowUp = {
  id: string;
  projectId: string;
  projectName: string;
  owner: string;
  contact: string;
  contactRole: string;
  dueAt: string;
  channel: 'Call' | 'Visit' | 'WhatsApp' | 'Email' | 'Meeting';
  status: 'Overdue' | 'Due today' | 'Upcoming' | 'Done';
  note: string;
};

export const followUps: FollowUp[] = projects.slice(0, 14).map((p, i) => {
  const offsetHrs = [-72, -36, -8, 0, 0, 2, 6, 18, 30, 48, 96, -120, -2, 12][i];
  const due = new Date(Date.now() + offsetHrs * 3600_000);
  const status: FollowUp['status'] =
    offsetHrs < -2 ? 'Overdue' : offsetHrs <= 12 ? 'Due today' : 'Upcoming';
  const channels: FollowUp['channel'][] = ['Call', 'Visit', 'WhatsApp', 'Email', 'Meeting'];
  return {
    id: `F-${2000 + i}`,
    projectId: p.id,
    projectName: p.name,
    owner: p.owner,
    contact: ['Eng. Saeed Al Marri', 'Ar. Priya Menon', 'Hassan Tabbara', 'Rashid Al Suwaidi', 'Dr. Karim Fawzy'][i % 5],
    contactRole: ['Project Director', 'Lead Architect', 'Procurement', 'Façade Consultant', 'Client Rep'][i % 5],
    dueAt: due.toISOString(),
    channel: channels[i % channels.length],
    status,
    note: [
      'Confirm A2 FR sample arrival at site office',
      'Walk through spec deviation in tender Section 07 42',
      'Push for shop drawings sign-off ahead of Eid',
      'Reconfirm AED 18M variation acceptance',
      'Schedule mock-up review with consultant',
      'Share fire test reports for BS 8414',
      'Recover dormant follow-up from 9 days back',
    ][i % 7],
  };
});

export type Salesperson = {
  id: string;
  name: string;
  region: string;
  initials: string;
  targetAED: number;
  achievedAED: number;
  pipelineAED: number;
  visitsThisWeek: number;
  conversionPct: number;
  online: boolean;
  lat: number;
  lng: number;
};

export const salesteam: Salesperson[] = [
  { id: 'S1', name: 'Karim Mansour', region: 'Dubai Central', initials: 'KM', targetAED: 12_000_000, achievedAED: 9_400_000, pipelineAED: 18_200_000, visitsThisWeek: 17, conversionPct: 38, online: true, lat: 25.2048, lng: 55.2708 },
  { id: 'S2', name: 'Aisha Al Mazrouei', region: 'Abu Dhabi', initials: 'AM', targetAED: 10_000_000, achievedAED: 11_200_000, pipelineAED: 22_400_000, visitsThisWeek: 21, conversionPct: 44, online: true, lat: 24.4539, lng: 54.3773 },
  { id: 'S3', name: 'Vikram Shenoy', region: 'Northern Emirates', initials: 'VS', targetAED: 8_000_000, achievedAED: 5_100_000, pipelineAED: 9_800_000, visitsThisWeek: 11, conversionPct: 26, online: false, lat: 25.7553, lng: 56.0241 },
  { id: 'S4', name: 'Layla Haddad', region: 'KSA – Riyadh', initials: 'LH', targetAED: 15_000_000, achievedAED: 13_900_000, pipelineAED: 31_500_000, visitsThisWeek: 18, conversionPct: 41, online: true, lat: 24.7136, lng: 46.6753 },
  { id: 'S5', name: 'Omar Bashir', region: 'Qatar & Oman', initials: 'OB', targetAED: 9_000_000, achievedAED: 6_700_000, pipelineAED: 14_300_000, visitsThisWeek: 9, conversionPct: 30, online: true, lat: 25.2854, lng: 51.5310 },
];

export const monthlyTrend = [
  { month: 'Dec', target: 8.5, achieved: 7.1 },
  { month: 'Jan', target: 9.0, achieved: 8.9 },
  { month: 'Feb', target: 9.5, achieved: 10.2 },
  { month: 'Mar', target: 10.0, achieved: 9.4 },
  { month: 'Apr', target: 11.0, achieved: 11.8 },
  { month: 'May', target: 12.0, achieved: 9.6 },
];

export const lossReasonBreakdown = [
  { reason: 'Consultant preference', value: 28 },
  { reason: 'Price too high', value: 22 },
  { reason: 'Delayed follow-up', value: 17 },
  { reason: 'Competitor relationship', value: 14 },
  { reason: 'Certification issue', value: 9 },
  { reason: 'Delivery concern', value: 6 },
  { reason: 'Other', value: 4 },
];

export const stageFunnel = STAGES.map((s) => ({
  stage: s,
  count: projects.filter((p) => p.stage === s).length,
  value: projects.filter((p) => p.stage === s).reduce((a, b) => a + b.value, 0),
}));

export type Relationship = {
  id: string;
  name: string;
  org: string;
  role: 'Architect' | 'Consultant' | 'Contractor' | 'Fabricator' | 'Developer';
  city: string;
  preferredBrand?: string;
  score: number; // 0-100
  lastTouch: string;
  openProjects: number;
  totalWonAED: number;
};

export const relationships: Relationship[] = [
  { id: 'R1', name: 'Ar. Priya Menon', org: 'Killa Design', role: 'Architect', city: 'Dubai', preferredBrand: 'Alubond', score: 92, lastTouch: '2 days ago', openProjects: 6, totalWonAED: 42_300_000 },
  { id: 'R2', name: 'Eng. Saeed Al Marri', org: 'WSP Middle East', role: 'Consultant', city: 'Dubai', preferredBrand: 'Reynobond', score: 64, lastTouch: '11 days ago', openProjects: 3, totalWonAED: 9_800_000 },
  { id: 'R3', name: 'Hassan Tabbara', org: 'ALEC Engineering', role: 'Contractor', city: 'Abu Dhabi', preferredBrand: 'Alubond', score: 86, lastTouch: '5 hours ago', openProjects: 4, totalWonAED: 28_400_000 },
  { id: 'R4', name: 'Rashid Al Suwaidi', org: 'Folcra Beach Industrial', role: 'Fabricator', city: 'Sharjah', preferredBrand: 'Alubond', score: 95, lastTouch: 'Yesterday', openProjects: 8, totalWonAED: 61_900_000 },
  { id: 'R5', name: 'Dr. Karim Fawzy', org: 'KEO International', role: 'Consultant', city: 'Riyadh', preferredBrand: 'Alpolic', score: 48, lastTouch: '21 days ago', openProjects: 2, totalWonAED: 3_100_000 },
  { id: 'R6', name: 'Ar. Yusuf Al Khaja', org: 'X Architects', role: 'Architect', city: 'Abu Dhabi', preferredBrand: 'Alubond', score: 81, lastTouch: '3 days ago', openProjects: 5, totalWonAED: 19_700_000 },
  { id: 'R7', name: 'Eng. Mohammed Latifi', org: 'AECOM', role: 'Consultant', city: 'Riyadh', preferredBrand: 'Alucobond', score: 55, lastTouch: '8 days ago', openProjects: 3, totalWonAED: 5_400_000 },
  { id: 'R8', name: 'Eng. Tariq Bin Salem', org: 'ASGC', role: 'Contractor', city: 'Dubai', preferredBrand: 'Alubond', score: 78, lastTouch: '4 days ago', openProjects: 4, totalWonAED: 22_800_000 },
];

export type Activity = {
  id: string;
  who: string;
  type: 'visit' | 'call' | 'note' | 'sample' | 'quote' | 'photo' | 'voice' | 'whatsapp' | 'stage';
  what: string;
  project: string;
  when: string;
  geo?: string;
};

export const activities: Activity[] = [
  { id: 'A1', who: 'Karim Mansour', type: 'visit', what: 'Site visit completed', project: 'Burj Binghatti Jacob & Co Residences', when: '12 min ago', geo: 'Business Bay, Dubai' },
  { id: 'A2', who: 'Aisha Al Mazrouei', type: 'voice', what: 'Voice note: spec deviation discussed with façade consultant', project: 'Yas Bay Arena Façade Refurbishment', when: '34 min ago', geo: 'Yas Island, Abu Dhabi' },
  { id: 'A3', who: 'Layla Haddad', type: 'sample', what: 'A2 FR sample delivered & signed', project: 'Diriyah Gate Cultural District', when: '1 hr ago', geo: 'Riyadh' },
  { id: 'A4', who: 'Vikram Shenoy', type: 'whatsapp', what: 'WhatsApp follow-up sent to Eng. Tabbara', project: 'Ras Al Khaimah Marjan Resort', when: '2 hr ago' },
  { id: 'A5', who: 'Omar Bashir', type: 'stage', what: 'Moved to Negotiation stage', project: 'Lusail Marina Plaza Tower C', when: '3 hr ago' },
  { id: 'A6', who: 'Karim Mansour', type: 'quote', what: 'Quotation v3 issued — AED 4.8M', project: 'Sobha Hartland Waves Opulence', when: '5 hr ago' },
  { id: 'A7', who: 'Aisha Al Mazrouei', type: 'photo', what: 'Geo-tagged photo uploaded — mock-up panel', project: 'Aldar Saadiyat Grove Retail', when: '6 hr ago', geo: 'Saadiyat Island' },
];

export const aiInsights = [
  {
    title: 'Projects above AED 2M lost due to delayed consultant engagement',
    body: 'In the last 90 days, 4 of 6 lost deals over AED 2M were preceded by ≥ 14 days without a consultant touchpoint. Suggest enforcing a 7-day consultant SLA on this segment.',
    severity: 'high' as const,
    metric: '+18% win-rate uplift potential',
  },
  {
    title: 'Reynobond gaining share with WSP consultants',
    body: 'Reynobond appears as competitor in 3 of the last 5 WSP-led specs. Karim flagged a relationship gap with Eng. Saeed Al Marri (score 64).',
    severity: 'medium' as const,
    metric: 'AED 38M exposure',
  },
  {
    title: '7 projects show "fake pipeline" pattern',
    body: 'Stage unchanged for 45+ days with no follow-up. Forecasted AED 22.4M is statistically unlikely to close this quarter.',
    severity: 'medium' as const,
    metric: 'AED 22.4M at risk',
  },
  {
    title: 'Fabricator Folcra Beach drives 38% of repeat business',
    body: 'Strongest predictor of close in your data. Recommend dedicated quarterly QBR + co-marketing for AlUla pipeline.',
    severity: 'low' as const,
    metric: '38% repeat share',
  },
];

export const heatmapData = projects.map((p) => ({ lat: p.lat, lng: p.lng, value: p.value }));

export const ceoMetrics = {
  pipelineHealth: 72,
  realPipelineAED: 218_400_000,
  fakePipelineAED: 22_400_000,
  velocityDays: 64,
  conversionPct: 34,
  marginLeakageAED: 3_100_000,
  topPerformer: 'Aisha Al Mazrouei',
  underperformer: 'Vikram Shenoy',
  megaProjects: 4,
};
