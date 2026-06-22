import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

import { env } from "../config/env";

export type StoredFile = {
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
};

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const BLOB_HOST_PATTERN = /(^|\.)blob\.vercel-storage\.com$/i;

function sanitizeFilename(originalName: string) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && BLOB_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function isLocalUploadUrl(url: string): boolean {
  return url.startsWith("/uploads/");
}

export function extractLegacyAttachmentUrls(message: string): string[] {
  const urls: string[] = [];
  for (const line of message.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Voice note recording: ")) {
      const url = trimmed.replace("Voice note recording: ", "").trim();
      if (url) urls.push(url);
      continue;
    }
    if (trimmed.startsWith("Attachment: ")) {
      const url = trimmed.replace("Attachment: ", "").trim();
      if (url) urls.push(url);
    }
  }
  return urls;
}

function localPathFromUploadUrl(url: string): string | null {
  if (!isLocalUploadUrl(url)) {
    return null;
  }
  const filename = path.basename(url);
  if (!filename || filename.includes("..")) {
    return null;
  }
  return path.join(LOCAL_UPLOADS_DIR, filename);
}

export async function deleteStoredFiles(urls: string[]): Promise<void> {
  const uniqueUrls = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (uniqueUrls.length === 0) {
    return;
  }

  const blobUrls = uniqueUrls.filter(isVercelBlobUrl);
  const localUrls = uniqueUrls.filter(isLocalUploadUrl);

  if (blobUrls.length > 0) {
    if (!env.BLOB_READ_WRITE_TOKEN) {
      console.warn("Skipping blob cleanup: BLOB_READ_WRITE_TOKEN is not configured");
    } else {
      await del(blobUrls, { token: env.BLOB_READ_WRITE_TOKEN });
    }
  }

  await Promise.all(
    localUrls.map(async (url) => {
      const filePath = localPathFromUploadUrl(url);
      if (!filePath) {
        return;
      }
      try {
        await unlink(filePath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          console.warn(`Failed to delete local upload ${filePath}:`, error);
        }
      }
    }),
  );
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

