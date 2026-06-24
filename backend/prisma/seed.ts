import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

import { env } from "../src/config/env";

const prisma = new PrismaClient();

const DEFAULT_MASTER_REGIONS = [
  "South India",
  "Sri Lanka",
  "UAE",
  "KSA",
  "Qatar",
  "GCC",
];

async function seedMasterRegions() {
  for (const [index, name] of DEFAULT_MASTER_REGIONS.entries()) {
    await prisma.masterRegion.upsert({
      where: { name },
      update: { sortOrder: index, isActive: true },
      create: { name, sortOrder: index, isActive: true },
    });
  }
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: {
      firstName: env.ADMIN_FIRST_NAME,
      lastName: env.ADMIN_LAST_NAME,
      role: UserRole.ADMIN,
      passwordHash,
      isActive: true
    },
    create: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      firstName: env.ADMIN_FIRST_NAME,
      lastName: env.ADMIN_LAST_NAME,
      role: UserRole.ADMIN,
      passwordHash,
      isActive: true
    }
  });
}

async function upsertUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
  managerId?: string | null;
  regionalManagerId?: string | null;
  operationLocations?: string[];
  yearlyTarget?: number | null;
  regions?: string[];
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email.toLowerCase() },
    update: {
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.role,
      passwordHash,
      managerId: params.managerId ?? null,
      regionalManagerId: params.regionalManagerId ?? null,
      operationLocations: params.operationLocations ?? [],
      yearlyTarget: params.yearlyTarget ?? null,
      regions: params.regions ?? [],
      isActive: true
    },
    create: {
      email: params.email.toLowerCase(),
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.role,
      passwordHash,
      managerId: params.managerId ?? null,
      regionalManagerId: params.regionalManagerId ?? null,
      operationLocations: params.operationLocations ?? [],
      yearlyTarget: params.yearlyTarget ?? null,
      regions: params.regions ?? [],
      isActive: true
    }
  });
}

async function seedTeam() {
  const regionalManagerSouth = await upsertUser({
    email: "regional.south@alubondcrm.local",
    firstName: "Anita",
    lastName: "Menon",
    role: UserRole.REGIONAL_MANAGER,
    password: "Regional@12345",
    operationLocations: ["South India"],
    regions: ["South India", "Sri Lanka"],
    yearlyTarget: 90_000_000,
  });

  const regionalManagerGcc = await upsertUser({
    email: "regional.gcc@alubondcrm.local",
    firstName: "Faisal",
    lastName: "Khan",
    role: UserRole.REGIONAL_MANAGER,
    password: "Regional@12345",
    operationLocations: ["GCC"],
    regions: ["UAE", "KSA", "Qatar"],
    yearlyTarget: 120_000_000,
  });

  const manager1 = await upsertUser({
    email: "manager1@alubondcrm.local",
    firstName: "Shibin",
    lastName: "Sha",
    role: UserRole.MANAGER,
    password: "Manager@12345",
    regionalManagerId: regionalManagerSouth.id,
    operationLocations: ["South India"],
    yearlyTarget: 42_000_000,
  });

  const manager2 = await upsertUser({
    email: "manager2@alubondcrm.local",
    firstName: "Alya",
    lastName: "Rahman",
    role: UserRole.MANAGER,
    password: "Manager@12345",
    regionalManagerId: regionalManagerGcc.id,
    operationLocations: ["UAE"],
    yearlyTarget: 48_000_000,
  });

  const rep1 = await upsertUser({
    email: "rep1@alubondcrm.local",
    firstName: "Rafi",
    lastName: "One",
    role: UserRole.SALES_REP,
    password: "Sales@12345",
    managerId: manager1.id,
    yearlyTarget: 21_600_000,
    operationLocations: ["South India"],
  });

  const rep2 = await upsertUser({
    email: "rep2@alubondcrm.local",
    firstName: "Maya",
    lastName: "Two",
    role: UserRole.SALES_REP,
    password: "Sales@12345",
    managerId: manager1.id,
    yearlyTarget: 18_000_000,
    operationLocations: ["South India"],
  });

  const rep3 = await upsertUser({
    email: "rep3@alubondcrm.local",
    firstName: "Vikram",
    lastName: "Three",
    role: UserRole.SALES_REP,
    password: "Sales@12345",
    managerId: manager2.id,
    yearlyTarget: 25_200_000,
    operationLocations: ["KSA"],
  });

  const rep4 = await upsertUser({
    email: "rep4@alubondcrm.local",
    firstName: "Lina",
    lastName: "Four",
    role: UserRole.SALES_REP,
    password: "Sales@12345",
    managerId: manager2.id,
    yearlyTarget: 24_000_000,
    operationLocations: ["UAE"],
  });

  return {
    regionalManagerSouth,
    regionalManagerGcc,
    manager1,
    manager2,
    repsByManager: {
      [manager1.id]: [rep1, rep2],
      [manager2.id]: [rep3, rep4]
    }
  };
}

async function seedProjects(team: {
  regionalManagerSouth: { id: string; firstName: string; lastName: string };
  regionalManagerGcc: { id: string; firstName: string; lastName: string };
  manager1: { id: string; firstName: string; lastName: string };
  manager2: { id: string; firstName: string; lastName: string };
  repsByManager: Record<string, Array<{ id: string; firstName: string; lastName: string }>>;
}) {
  const projects = [
    {
      name: "Mulk Heights Facade",
      city: "Alappuzha",
      country: "India",
      developer: "Kent Developers",
      stage: "Lead Identified",
      valueAed: 1_200_000,
      lat: 9.4981,
      lng: 76.3388,
      probability: 20,
      daysInStage: 1,
      competitor: null as string | null,
      manager: team.manager1
    },
    {
      name: "Jumeirah Bay Tower",
      city: "Dubai",
      country: "United Arab Emirates",
      developer: "Meraas",
      stage: "Negotiation",
      valueAed: 8_750_000,
      lat: 25.2048,
      lng: 55.2708,
      probability: 68,
      daysInStage: 9,
      competitor: "Alucobond",
      manager: team.manager2
    },
    {
      name: "Riyadh Metro Plaza",
      city: "Riyadh",
      country: "Saudi Arabia",
      developer: "Diriyah Group",
      stage: "PO Expected",
      valueAed: 6_200_000,
      lat: 24.7136,
      lng: 46.6753,
      probability: 82,
      daysInStage: 6,
      competitor: "Reynobond",
      manager: team.manager1
    }
  ];

  for (const project of projects) {
    const reps = team.repsByManager[project.manager.id] ?? [];
    const salesRepIds = reps.map((rep) => rep.id);
    const salesRepNames = reps.map((rep) => `${rep.firstName} ${rep.lastName}`.trim());
    const managerName = `${project.manager.firstName} ${project.manager.lastName}`.trim();

    const existing = await prisma.project.findFirst({
      where: { name: project.name }
    });

    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          city: project.city,
          country: project.country,
          developer: project.developer,
          stage: project.stage,
          valueAed: project.valueAed,
          lat: project.lat,
          lng: project.lng,
          probability: project.probability,
          daysInStage: project.daysInStage,
          competitor: project.competitor,
          owner: salesRepNames[0] ?? managerName,
          managerId: project.manager.id,
          managerName,
          salesRepIds,
          salesRepNames
        }
      });
      continue;
    }

    await prisma.project.create({
      data: {
        name: project.name,
        city: project.city,
        country: project.country,
        developer: project.developer,
        stage: project.stage,
        valueAed: project.valueAed,
        lat: project.lat,
        lng: project.lng,
        probability: project.probability,
        daysInStage: project.daysInStage,
        competitor: project.competitor,
        owner: salesRepNames[0] ?? managerName,
        managerId: project.manager.id,
        managerName,
        salesRepIds,
        salesRepNames
      }
    });
  }
}

function hashString(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function jitter(value: number, amount: number, seed: number) {
  const signed = ((seed % 2000) / 1000) - 1; // -1..1
  return value + signed * amount;
}

async function seedLocationHistory() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.SALES_REP, UserRole.MANAGER, UserRole.CEO] }
    },
    select: { id: true, role: true, managerId: true }
  });

  if (users.length === 0) return;

  const projects = await prisma.project.findMany({
    select: { id: true, managerId: true, salesRepIds: true, lat: true, lng: true }
  });

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 29);

  await prisma.userLocationPing.deleteMany({
    where: {
      userId: { in: users.map((user) => user.id) },
      recordedAt: { gte: since }
    }
  });

  const rows: Array<{
    userId: string;
    lat: number;
    lng: number;
    accuracyM: number;
    recordedAt: Date;
  }> = [];

  for (const user of users) {
    const assigned = projects.filter((project) => {
      if (user.role === UserRole.MANAGER) return project.managerId === user.id;
      if (user.role === UserRole.SALES_REP) return project.salesRepIds.includes(user.id);
      return false;
    });

    for (let offset = 0; offset < 30; offset++) {
      const day = new Date(since);
      day.setUTCDate(since.getUTCDate() + offset);
      const isoDate = day.toISOString().slice(0, 10);
      const h = hashString(`${user.id}-${isoDate}`);
      const weekday = day.getUTCDay(); // 0..6
      const active = weekday === 0 ? false : weekday === 6 ? h % 100 < 35 : h % 100 < 90;
      if (!active) continue;

      const pointsCount = 10 + (h % 8); // 10..17
      const baseHour = 7 + (h % 2); // 7..8 UTC start
      const totalMinutes = 7 * 60 + (h % 120); // 7h..9h
      const targets = assigned.length > 0
        ? assigned
        : [{ lat: 25.2048 + ((h % 100) / 5000), lng: 55.2708 + ((h % 90) / 5000) }];

      for (let i = 0; i < pointsCount; i++) {
        const target = targets[i % targets.length];
        const next = targets[(i + 1) % targets.length];
        const t = pointsCount === 1 ? 0 : i / (pointsCount - 1);
        const lat = jitter(target.lat * (1 - t) + next.lat * t, 0.01, h + i * 31);
        const lng = jitter(target.lng * (1 - t) + next.lng * t, 0.01, h + i * 47);

        const recordedAt = new Date(Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
          baseHour,
          Math.round((totalMinutes * t)) % 60,
          0,
          0
        ));
        recordedAt.setUTCHours(baseHour + Math.floor((totalMinutes * t) / 60));

        rows.push({
          userId: user.id,
          lat,
          lng,
          accuracyM: 8 + ((h + i) % 25),
          recordedAt
        });
      }
    }
  }

  if (rows.length > 0) {
    await prisma.userLocationPing.createMany({ data: rows });
  }
}

async function main() {
  await seedMasterRegions();
  await seedAdmin();
  const team = await seedTeam();
  await seedProjects(team);
  await seedLocationHistory();
  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${env.ADMIN_EMAIL}, managers/reps, sample projects, and 30-day location history`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
