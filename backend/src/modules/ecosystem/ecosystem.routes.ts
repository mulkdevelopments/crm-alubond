import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ecosystemBridgeAuth } from "../../middleware/ecosystem-bridge";

export const ecosystemRouter = Router();

ecosystemRouter.use(ecosystemBridgeAuth);

ecosystemRouter.get("/summary", async (_req, res) => {
  try {
    const [users, activeUsers, projects, projectsByStage] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.project.count(),
      prisma.project.groupBy({
        by: ["stage"],
        _count: { _all: true },
      }),
    ]);

    const pipelineValue = await prisma.project.aggregate({
      _sum: { valueAed: true },
    });

    res.json({
      service: "crm",
      ok: true,
      generatedAt: new Date().toISOString(),
      metrics: {
        users,
        activeUsers,
        projects,
        pipelineValueAed: pipelineValue._sum.valueAed ?? 0,
        stages: Object.fromEntries(
          projectsByStage.map((row) => [row.stage, row._count._all]),
        ),
      },
      domains: {
        clients: { projects, note: "Projects carry client/developer identity today" },
        leads: { projects },
        work: { activeUsers },
      },
    });
  } catch (error) {
    res.status(503).json({
      service: "crm",
      ok: false,
      error: error instanceof Error ? error.message : "Summary failed",
    });
  }
});
