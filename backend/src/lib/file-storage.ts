import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

import { env } from "../config/env";

export type StoredFile = {
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
};

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function sanitizeFilename(originalName: string) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function storeUploadedFile(file: Express.Multer.File): Promise<StoredFile> {
  if (env.FILE_STORAGE_PROVIDER === "vercel_blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is required when FILE_STORAGE_PROVIDER=vercel_blob");
    }
    const filename = `${Date.now()}-${sanitizeFilename(file.originalname)}`;
    const blob = await put(filename, file.buffer, {
      access: env.BLOB_ACCESS,
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype || undefined,
    });
    return {
      name: file.originalname,
      filename,
      size: file.size,
      mimeType: file.mimetype,
      url: blob.url,
    };
  }

  await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  const filename = `${Date.now()}-${sanitizeFilename(file.originalname)}`;
  const absolutePath = path.join(LOCAL_UPLOADS_DIR, filename);
  await writeFile(absolutePath, file.buffer);
  return {
    name: file.originalname,
    filename,
    size: file.size,
    mimeType: file.mimetype,
    url: `/uploads/${filename}`,
  };
}

