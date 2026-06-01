import cors from "cors";
import express from "express";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { env } from "./config/env";
import { apiRouter } from "./routes";

export const app = express();
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (env.FILE_STORAGE_PROVIDER === "local") {
  mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN
  })
);
app.use(express.json());
if (env.FILE_STORAGE_PROVIDER === "local") {
  app.use("/uploads", express.static(uploadsDir));
}

app.use(env.API_PREFIX, apiRouter);

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Alubond CRM API",
    docsHint: `Use ${env.API_PREFIX}/health and ${env.API_PREFIX}/projects`
  });
});
