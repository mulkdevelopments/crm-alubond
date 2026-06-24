import { z } from "zod";

export function formatZodValidationMessage(error: z.ZodError, fallback = "Invalid payload"): string {
  const flattened = error.flatten();
  const parts = [
    ...flattened.formErrors,
    ...Object.entries(flattened.fieldErrors).flatMap(([field, messages]) =>
      (Array.isArray(messages) ? messages : []).map((message: string) => `${field}: ${message}`)
    ),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("; ") : fallback;
}

export function zodValidationResponse(error: z.ZodError, fallback = "Invalid payload") {
  return {
    message: formatZodValidationMessage(error, fallback),
    issues: error.flatten(),
  };
}

export function normalizeUserRegionPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const body = { ...(raw as Record<string, unknown>) };
  const hasOperationLocations = Array.isArray(body.operationLocations) && body.operationLocations.length > 0;
  const legacyOperationLocation =
    typeof body.operationLocation === "string" ? body.operationLocation.trim() : "";

  if (!hasOperationLocations && legacyOperationLocation && legacyOperationLocation !== "Not set") {
    body.operationLocations = [legacyOperationLocation];
  }

  if ("operationLocation" in body) {
    delete body.operationLocation;
  }

  return body;
}
