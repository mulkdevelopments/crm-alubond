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

const configuredOrigins = env.FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin or server-to-server requests without Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Allow Render-hosted frontend domains to avoid strict single-origin mismatch.
    if (origin.endsWith(".onrender.com")) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(
  cors(corsOptions)
);
app.options(/.*/, cors(corsOptions));
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
