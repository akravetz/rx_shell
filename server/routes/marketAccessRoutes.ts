/* ── Market Access Routes ─────────────────────────────────────────────
   Local assessment persistence. Multipart create copies bytes unchanged.
   HTTP bodies never include host or container paths.
   ──────────────────────────────────────────────────────────────────── */

import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import {
  MarketAccessAssessmentService,
  MarketAccessServiceError,
  MAX_PACKAGE_FILE_SIZE_BYTES,
  resolveAssessmentsRoot,
  isAssessmentUuid,
  type AssessmentRecord,
  type MarketAccessErrorCode,
} from "../services/marketAccessAssessmentService.js";

type HttpErrorFn = (message: string, status: number, code: string) => Error;

interface MarketAccessRoutesDeps {
  authMiddleware: {
    requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  };
  httpError: HttpErrorFn;
  repoRoot: string;
}

/** View-model JSON — no filesystem paths. */
export interface AssessmentDto {
  id: string;
  productName: string;
  createdAt: string;
  packageFile: {
    fileName: string;
    fileSize: number;
    format: AssessmentRecord["package"]["format"];
  };
}

const ERROR_STATUS: Record<MarketAccessErrorCode, number> = {
  invalid_product_name: 400,
  unsupported_package_type: 400,
  invalid_upload: 400,
  file_too_large: 413,
  write_failed: 500,
  storage_unavailable: 500,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PACKAGE_FILE_SIZE_BYTES },
});

export function toAssessmentDto(record: AssessmentRecord): AssessmentDto {
  return {
    id: record.id,
    productName: record.productName,
    createdAt: record.createdAt,
    packageFile: {
      fileName: record.package.originalFileName,
      fileSize: record.package.fileSize,
      format: record.package.format,
    },
  };
}

export function classifyPackageFiles(
  files: Array<{ fieldname: string }> | undefined,
):
  | { ok: true }
  | { ok: false; code: "missing_package_file" | "invalid_upload"; message: string } {
  if (!files || files.length === 0) {
    return {
      ok: false,
      code: "missing_package_file",
      message: "A package file is required.",
    };
  }
  if (files.length > 1 || files[0].fieldname !== "file") {
    return {
      ok: false,
      code: "invalid_upload",
      message: "Upload must include exactly one package file.",
    };
  }
  return { ok: true };
}

export function isMulterLimitFileSize(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "LIMIT_FILE_SIZE"
  );
}

function wrap(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] ?? "" : val ?? "";
}

function readProductName(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as { productName?: unknown }).productName;
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

function throwServiceError(err: unknown, httpError: HttpErrorFn, fallback: MarketAccessErrorCode): never {
  if (err instanceof MarketAccessServiceError) {
    throw httpError(err.message, ERROR_STATUS[err.code], err.code);
  }
  console.error("[market-access]", err);
  const message =
    fallback === "storage_unavailable"
      ? "Assessment storage is unavailable."
      : "Could not save the assessment.";
  throw httpError(message, ERROR_STATUS[fallback], fallback);
}

export function registerMarketAccessRoutes(
  app: Express,
  deps: MarketAccessRoutesDeps,
): void {
  const { authMiddleware, httpError, repoRoot } = deps;
  const auth = authMiddleware.requireAuth;

  let service: MarketAccessAssessmentService | null = null;

  function getService(): MarketAccessAssessmentService {
    if (!service) {
      const root = resolveAssessmentsRoot(
        repoRoot,
        process.env.AISHELL_MARKET_ACCESS_ASSESSMENTS_ROOT,
      );
      service = new MarketAccessAssessmentService(root);
    }
    return service;
  }

  function acceptPackageUpload(req: Request, res: Response, next: NextFunction): void {
    upload.any()(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (isMulterLimitFileSize(err)) {
        next(httpError("Package file must be 20 MiB or smaller.", 413, "file_too_large"));
        return;
      }
      next(httpError("Upload must include exactly one package file.", 400, "invalid_upload"));
    });
  }

  app.get(
    "/api/market-access/assessments",
    auth,
    wrap(async (_req, res) => {
      try {
        const { assessments, skippedCount } = await getService().list();
        res.json({
          assessments: assessments.map(toAssessmentDto),
          skippedCount,
        });
      } catch (err) {
        throwServiceError(err, httpError, "storage_unavailable");
      }
    }),
  );

  app.post(
    "/api/market-access/assessments",
    auth,
    acceptPackageUpload,
    wrap(async (req, res) => {
      const files = req.files as Express.Multer.File[] | undefined;
      const classified = classifyPackageFiles(files);
      if (!classified.ok) {
        throw httpError(classified.message, 400, classified.code);
      }

      const file = files![0];
      try {
        const record = await getService().create({
          productName: readProductName(req.body),
          originalFileName: file.originalname,
          bytes: file.buffer,
        });
        res.status(201).json({ assessment: toAssessmentDto(record) });
      } catch (err) {
        throwServiceError(err, httpError, "write_failed");
      }
    }),
  );

  app.get(
    "/api/market-access/assessments/:id",
    auth,
    wrap(async (req, res) => {
      const id = param(req, "id");
      if (!isAssessmentUuid(id)) {
        throw httpError("Assessment id is not valid.", 400, "invalid_id");
      }
      try {
        const record = await getService().getById(id);
        if (!record) {
          throw httpError("Assessment not found.", 404, "not_found");
        }
        res.json({ assessment: toAssessmentDto(record) });
      } catch (err) {
        if (err instanceof Error && "status" in err) throw err;
        throwServiceError(err, httpError, "storage_unavailable");
      }
    }),
  );
}
