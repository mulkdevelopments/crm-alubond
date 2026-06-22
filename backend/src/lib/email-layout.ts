import { env } from "../config/env";

const BRAND_RED = "#E30613";

export function getEmailPublicBaseUrl() {
  const base = env.APP_BASE_URL || env.FRONTEND_ORIGIN.split(",")[0]?.trim() || "https://crm.alubond.com";
  return base.replace(/\/$/, "");
}

export function getEmailLogoUrl() {
  return `${getEmailPublicBaseUrl()}/brand/logo-mark.png`;
}

export function emailButtonStyle(background = BRAND_RED) {
  return `display:inline-block;background:${background};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600`;
}

export function wrapEmailHtml(body: string) {
  const logoUrl = getEmailLogoUrl();

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto">
      <div style="margin:0 0 24px">
        <img src="${logoUrl}" alt="Alubond" width="56" height="56" style="display:block;width:56px;height:56px;border:0" />
      </div>
      ${body}
      <p style="margin:24px 0 0;color:#64748b;font-size:13px">Alubond CRM</p>
    </div>
  `.trim();
}
