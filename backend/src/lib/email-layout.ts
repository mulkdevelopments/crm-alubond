import fs from "fs";
import path from "path";

import { env } from "../config/env";

const BRAND_RED = "#E30613";
export const EMAIL_LOGO_CID = "alubond-logo";

export function getEmailPublicBaseUrl() {
  const base = env.APP_BASE_URL || env.FRONTEND_ORIGIN.split(",")[0]?.trim() || "https://crm.alubond.com";
  return base.replace(/\/$/, "");
}

function getEmailLogoPath() {
  return path.join(process.cwd(), "assets/email/logo-mark.png");
}

let cachedLogoBuffer: Buffer | null | undefined;

function readEmailLogoBuffer() {
  if (cachedLogoBuffer !== undefined) return cachedLogoBuffer;

  const logoPath = getEmailLogoPath();
  if (!fs.existsSync(logoPath)) {
    cachedLogoBuffer = null;
    return cachedLogoBuffer;
  }

  cachedLogoBuffer = fs.readFileSync(logoPath);
  return cachedLogoBuffer;
}

export function getEmailLogoAttachment() {
  const content = readEmailLogoBuffer();
  if (!content) return null;

  return {
    filename: "logo-mark.png",
    content,
    contentType: "image/png",
    contentId: EMAIL_LOGO_CID,
  };
}

export function getEmailLogoSrc() {
  const content = readEmailLogoBuffer();
  if (content) {
    return `cid:${EMAIL_LOGO_CID}`;
  }

  return `${getEmailPublicBaseUrl()}/brand/logo-mark.png`;
}

export function emailButtonStyle(background = BRAND_RED) {
  return `display:inline-block;background:${background};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600`;
}

export function wrapEmailHtml(body: string) {
  const logoSrc = getEmailLogoSrc();

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto">
      <div style="margin:0 0 24px">
        <img src="${logoSrc}" alt="Alubond" width="56" height="56" style="display:block;width:56px;height:56px;border:0" />
      </div>
      ${body}
      <p style="margin:24px 0 0;color:#64748b;font-size:13px">Alubond CRM</p>
    </div>
  `.trim();
}

export function getBrandedEmailAttachments() {
  const logo = getEmailLogoAttachment();
  return logo ? [logo] : [];
}

export function buildBrandedEmail(body: string) {
  return {
    html: wrapEmailHtml(body),
    attachments: getBrandedEmailAttachments(),
  };
}
