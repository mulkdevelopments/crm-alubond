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
  .map((origin) => origin.replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin or server-to-server requests without Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (configuredOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    // Allow Render-hosted frontend domains to avoid strict single-origin mismatch.
    if (normalizedOrigin.endsWith(".onrender.com")) {
      callback(null, true);
      return;
    }

    // Allow company-hosted frontend domains.
    if (normalizedOrigin === "https://uniqube.build" || normalizedOrigin.endsWith(".uniqube.build")) {
      callback(null, true);
      return;
    }

    // Allow alubond hosted frontend domains.
    if (normalizedOrigin === "https://alubond.com" || normalizedOrigin.endsWith(".alubond.com")) {
      callback(null, true);
      return;
    }

    // Allow Vercel-hosted frontend domains.
    if (normalizedOrigin.endsWith(".vercel.app")) {
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
