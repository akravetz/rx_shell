/* ── Market Access assessment API ────────────────────────────────────
   The browser's phone line to Express. Views call these functions
   instead of fetch so URL, FormData, and { error, code } live in one
   place.

   No mapper: a mapper would copy each field from the JSON into a
   different UI shape (e.g. createdAt string → Date). We kept the HTTP
   body the same as Assessment, so we store the JSON as-is.
   ──────────────────────────────────────────────────────────────────── */

import type { Assessment, CreateAssessmentInput } from "./types";

const ASSESSMENTS_URL = "/api/market-access/assessments";

/** Human message for the UI; machine `code` for branching (404 vs down). */
export class AssessmentApiError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AssessmentApiError";
    this.code = code;
  }
}

/** Turn `{ error, code }` (or a missing/invalid body) into a typed error. */
export function apiErrorFromBody(
  body: unknown,
  fallbackMessage: string,
  fallbackCode = "request_failed",
): AssessmentApiError {
  if (!body || typeof body !== "object") {
    return new AssessmentApiError(fallbackMessage, fallbackCode);
  }
  const rec = body as { error?: unknown; code?: unknown };
  const error =
    typeof rec.error === "string" && rec.error.trim()
      ? rec.error
      : fallbackMessage;
  const code =
    typeof rec.code === "string" && rec.code.trim() ? rec.code : fallbackCode;
  return new AssessmentApiError(error, code);
}

async function readBody(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

/**
 * Shared fetch plumbing for the three public calls below.
 * fetch() only throws when the machine cannot reach the server
 * (process down, network). HTTP 4xx/5xx still return a Response, so
 * we check res.ok and promote those to AssessmentApiError.
 */
async function requestJson(
  url: string,
  init: RequestInit | undefined,
  fallbackMessage: string,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new AssessmentApiError("Could not reach the server.", "network_error");
  }
  if (!res.ok) {
    throw apiErrorFromBody(await readBody(res), fallbackMessage);
  }
  return readBody(res);
}

export async function listAssessments(): Promise<{
  assessments: Assessment[];
  skippedCount: number;
}> {
  const body = await requestJson(
    ASSESSMENTS_URL,
    undefined,
    "Could not load assessments.",
  );
  if (!body || typeof body !== "object") {
    throw new AssessmentApiError("Could not load assessments.", "request_failed");
  }
  const rec = body as { assessments?: unknown; skippedCount?: unknown };
  if (!Array.isArray(rec.assessments)) {
    throw new AssessmentApiError("Could not load assessments.", "request_failed");
  }
  return {
    assessments: rec.assessments as Assessment[],
    skippedCount: typeof rec.skippedCount === "number" ? rec.skippedCount : 0,
  };
}

export async function createAssessment(
  input: CreateAssessmentInput,
): Promise<Assessment> {
  // FormData (not JSON) so the File bytes can travel with the name.
  // Do not set Content-Type — the browser adds the multipart boundary.
  const form = new FormData();
  form.append("productName", input.productName);
  form.append("file", input.file);

  const body = await requestJson(
    ASSESSMENTS_URL,
    { method: "POST", body: form },
    "Could not save the assessment.",
  );
  return readAssessment(body, "Could not save the assessment.");
}

export async function getAssessment(id: string): Promise<Assessment> {
  const body = await requestJson(
    `${ASSESSMENTS_URL}/${encodeURIComponent(id)}`,
    undefined,
    "Could not load the assessment.",
  );
  return readAssessment(body, "Could not load the assessment.");
}

function readAssessment(body: unknown, fallbackMessage: string): Assessment {
  if (!body || typeof body !== "object") {
    throw new AssessmentApiError(fallbackMessage, "request_failed");
  }
  const assessment = (body as { assessment?: unknown }).assessment;
  if (!assessment || typeof assessment !== "object") {
    throw new AssessmentApiError(fallbackMessage, "request_failed");
  }
  return assessment as Assessment;
}
