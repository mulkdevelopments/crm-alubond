export const MOBILE_APP_SCHEME = "alubond-crm";

export function mobileResetPasswordUrl(token: string) {
  return `${MOBILE_APP_SCHEME}://reset-password?token=${encodeURIComponent(token)}`;
}

export function isMobileUserAgent(userAgent: string) {
  return /iPhone|iPad|iPod|Android/i.test(userAgent);
}
