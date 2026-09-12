/* ── Market Access: Assessment Service ────────────────────────────────
   Persist assessments as directories under a host-visible root.
   Server cannot import src/apps — keep the format allowlist duplicated
   and aligned by test.
   ──────────────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const ASSESSMENTS_ROOT_ENV = "AISHELL_MARKET_ACCESS_ASSESSMENTS_ROOT";
export const MAX_PRODUCT_NAME_LENGTH = 200;
export const MAX_PACKAGE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_SLUG_LENGTH = 80;
export const ASSESSMENT_SCHEMA_VERSION = 1;
export const SOURCES_DIR = "sources";
export const KNOWLEDGE_DIR = "knowledge";

/** Duplicated from client packageFile.ts — do not import src/apps. */
export type PackageFormat = "markdown" | "docx" | "pptx";

export const PACKAGE_FORMAT_BY_EXTENSION: Record<string, PackageFormat> = {
  md: "markdown",
  markdown: "markdown",
  docx: "docx",
  pptx: "pptx",
};

export type MarketAccessErrorCode =
  | "invalid_product_name"
  | "unsupported_package_type"
  | "invalid_upload"
  | "file_too_large"
  | "write_failed"
  | "storage_unavailable";

export class MarketAccessServiceError extends Error {
  readonly code: MarketAccessErrorCode;

  constructor(message: string, code: MarketAccessErrorCode) {
    super(message);
    this.name = "MarketAccessServiceError";
    this.code = code;
  }
}

export interface AssessmentPackageRecord {
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  format: PackageFormat;
}

/** On-disk assessment.json shape. Views never consume this record. */
export interface AssessmentRecord {
  schemaVersion: typeof ASSESSMENT_SCHEMA_VERSION;
  id: string;
  productName: string;
  createdAt: string;
  updatedAt: string;
  package: AssessmentPackageRecord;
}

export interface CreateAssessmentInput {
  productName: string;
  originalFileName: string;
  bytes: Buffer;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAssessmentUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Resolve the assessments directory.
 * Unset env → `<repo>/.local/market-access/assessments`.
 * If the env var is set, it must be a non-empty absolute path — never
 * resolve a relative value onto cwd.
 */
export function resolveAssessmentsRoot(
  repoRoot: string,
  envValue: string | undefined,
): string {
  if (envValue === undefined) {
    return path.join(repoRoot, ".local", "market-access", "assessments");
  }
  const trimmed = envValue.trim();
  if (!trimmed) {
    throw new MarketAccessServiceError(
      "Assessment storage is unavailable.",
      "storage_unavailable",
    );
  }
  if (!path.isAbsolute(trimmed)) {
    throw new MarketAccessServiceError(
      "Assessment storage is unavailable.",
      "storage_unavailable",
    );
  }
  return trimmed;
}

export function getPackageFileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return null;
  return fileName.slice(dot + 1).toLowerCase();
}

export function getPackageFormat(fileName: string): PackageFormat | null {
  const ext = getPackageFileExtension(fileName);
  if (!ext) return null;
  return PACKAGE_FORMAT_BY_EXTENSION[ext] ?? null;
}

/** Strip posix and Windows path prefixes; reject empty / `.` / `..` / controls. */
export function sanitizePackageFileName(originalFileName: string): string | null {
  const name = path.posix.basename(path.win32.basename(originalFileName));
  if (!name || name === "." || name === "..") return null;
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

export function slugFromProductName(
  productName: string,
  fallbackId: string,
): string {
  const raw = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!raw) return fallbackId;
  const capped = raw.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  return capped || fallbackId;
}

function isEexist(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "EEXIST"
  );
}

function validateProductName(productName: string): string {
  const trimmed = productName.trim();
  if (!trimmed) {
    throw new MarketAccessServiceError(
      "Product or drug name is required.",
      "invalid_product_name",
    );
  }
  if (trimmed.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new MarketAccessServiceError(
      "Product or drug name must be 200 characters or fewer.",
      "invalid_product_name",
    );
  }
  return trimmed;
}

function isPackageFormat(value: unknown): value is PackageFormat {
  return value === "markdown" || value === "docx" || value === "pptx";
}

function parseAssessmentRecord(raw: string): AssessmentRecord | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (rec.schemaVersion !== ASSESSMENT_SCHEMA_VERSION) return null;
  if (typeof rec.id !== "string" || !isAssessmentUuid(rec.id)) return null;
  if (typeof rec.productName !== "string" || !rec.productName.trim()) return null;
  if (typeof rec.createdAt !== "string" || typeof rec.updatedAt !== "string") {
    return null;
  }
  const pkg = rec.package;
  if (!pkg || typeof pkg !== "object") return null;
  const pack = pkg as Record<string, unknown>;
  if (
    typeof pack.originalFileName !== "string" ||
    typeof pack.storedFileName !== "string" ||
    typeof pack.fileSize !== "number" ||
    !Number.isFinite(pack.fileSize) ||
    pack.fileSize < 0 ||
    !isPackageFormat(pack.format)
  ) {
    return null;
  }
  return {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    id: rec.id,
    productName: rec.productName,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    package: {
      originalFileName: pack.originalFileName,
      storedFileName: pack.storedFileName,
      fileSize: pack.fileSize,
      format: pack.format,
    },
  };
}

export class MarketAccessAssessmentService {
  constructor(private readonly assessmentsRoot: string) {}

  getRoot(): string {
    return this.assessmentsRoot;
  }

  async list(): Promise<{
    assessments: AssessmentRecord[];
    skippedCount: number;
  }> {
    if (!fs.existsSync(this.assessmentsRoot)) {
      return { assessments: [], skippedCount: 0 };
    }

    let entries;
    try {
      entries = fs.readdirSync(this.assessmentsRoot, { withFileTypes: true });
    } catch (err) {
      console.error("[market-access] Cannot read assessments root:", err);
      throw new MarketAccessServiceError(
        "Assessment storage is unavailable.",
        "storage_unavailable",
      );
    }

    const assessments: AssessmentRecord[] = [];
    let skippedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const jsonPath = path.join(
        this.assessmentsRoot,
        entry.name,
        "assessment.json",
      );
      if (!fs.existsSync(jsonPath)) continue;
      const record = this.readRecordFile(jsonPath);
      if (!record) {
        skippedCount += 1;
        continue;
      }
      assessments.push(record);
    }

    assessments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { assessments, skippedCount };
  }

  /** Lookup by scanning assessment.json — never path.join(root, id). */
  async getById(id: string): Promise<AssessmentRecord | null> {
    if (!fs.existsSync(this.assessmentsRoot)) return null;

    let entries;
    try {
      entries = fs.readdirSync(this.assessmentsRoot, { withFileTypes: true });
    } catch (err) {
      console.error("[market-access] Cannot read assessments root:", err);
      throw new MarketAccessServiceError(
        "Assessment storage is unavailable.",
        "storage_unavailable",
      );
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const jsonPath = path.join(
        this.assessmentsRoot,
        entry.name,
        "assessment.json",
      );
      if (!fs.existsSync(jsonPath)) continue;
      const record = this.readRecordFile(jsonPath);
      if (record?.id === id) return record;
    }
    return null;
  }

  async create(input: CreateAssessmentInput): Promise<AssessmentRecord> {
    const productName = validateProductName(input.productName);
    const storedFileName = sanitizePackageFileName(input.originalFileName);
    if (!storedFileName) {
      throw new MarketAccessServiceError(
        "Upload must include exactly one package file.",
        "invalid_upload",
      );
    }
    const format = getPackageFormat(storedFileName);
    if (!format) {
      throw new MarketAccessServiceError(
        "Package file type is not supported.",
        "unsupported_package_type",
      );
    }
    if (input.bytes.length > MAX_PACKAGE_FILE_SIZE_BYTES) {
      throw new MarketAccessServiceError(
        "Package file must be 20 MiB or smaller.",
        "file_too_large",
      );
    }

    this.ensureRoot();

    const id = crypto.randomUUID();
    const slug = slugFromProductName(productName, id);
    let assessmentDir: string | null = null;

    try {
      assessmentDir = this.mkdirAssessmentDir(slug);
      const sourcesDir = path.join(assessmentDir, SOURCES_DIR);
      fs.mkdirSync(sourcesDir);
      // Empty workflow dir only — no knowledge files or generation in PR 2.
      fs.mkdirSync(path.join(assessmentDir, KNOWLEDGE_DIR));
      fs.writeFileSync(path.join(sourcesDir, storedFileName), input.bytes);

      const now = new Date().toISOString();
      const record: AssessmentRecord = {
        schemaVersion: ASSESSMENT_SCHEMA_VERSION,
        id,
        productName,
        createdAt: now,
        updatedAt: now,
        package: {
          originalFileName: storedFileName,
          storedFileName,
          fileSize: input.bytes.length,
          format,
        },
      };
      this.writeRecordAtomic(assessmentDir, record);
      return record;
    } catch (err) {
      if (assessmentDir) this.removeCreatedDir(assessmentDir);
      if (err instanceof MarketAccessServiceError) throw err;
      console.error("[market-access] Failed to write assessment:", err);
      throw new MarketAccessServiceError(
        "Could not save the assessment.",
        "write_failed",
      );
    }
  }

  private ensureRoot(): void {
    try {
      fs.mkdirSync(this.assessmentsRoot, { recursive: true });
    } catch (err) {
      console.error("[market-access] Cannot use assessments root:", err);
      throw new MarketAccessServiceError(
        "Assessment storage is unavailable.",
        "storage_unavailable",
      );
    }
  }

  /** mkdir the leaf without recursive so EEXIST can drive -2, -3 suffixes. */
  private mkdirAssessmentDir(slug: string): string {
    let candidate = slug;
    let suffix = 2;
    for (let attempt = 0; attempt < 10_000; attempt += 1) {
      const dir = path.join(this.assessmentsRoot, candidate);
      try {
        fs.mkdirSync(dir);
        return dir;
      } catch (err) {
        if (!isEexist(err)) {
          console.error("[market-access] Cannot create assessment directory:", err);
          throw new MarketAccessServiceError(
            "Could not save the assessment.",
            "write_failed",
          );
        }
        candidate = `${slug}-${suffix}`;
        suffix += 1;
      }
    }
    throw new MarketAccessServiceError(
      "Could not save the assessment.",
      "write_failed",
    );
  }

  private writeRecordAtomic(assessmentDir: string, record: AssessmentRecord): void {
    const finalPath = path.join(assessmentDir, "assessment.json");
    const tmpPath = path.join(
      assessmentDir,
      `assessment.json.${crypto.randomUUID()}.tmp`,
    );
    fs.writeFileSync(tmpPath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
    fs.renameSync(tmpPath, finalPath);
  }

  /** Remove only the directory this request created — never a parent. */
  private removeCreatedDir(assessmentDir: string): void {
    const resolved = path.resolve(assessmentDir);
    const rootResolved = path.resolve(this.assessmentsRoot);
    const prefix = rootResolved.endsWith(path.sep)
      ? rootResolved
      : rootResolved + path.sep;
    if (resolved === rootResolved || !resolved.startsWith(prefix)) {
      return;
    }
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
    } catch (err) {
      console.error("[market-access] Failed to clean up assessment directory:", err);
    }
  }

  private readRecordFile(jsonPath: string): AssessmentRecord | null {
    try {
      return parseAssessmentRecord(fs.readFileSync(jsonPath, "utf-8"));
    } catch {
      return null;
    }
  }
}
