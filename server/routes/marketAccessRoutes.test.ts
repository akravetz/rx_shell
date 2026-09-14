import { describe, expect, it } from "vitest";
import multer from "multer";
import {
  classifyPackageFiles,
  isMulterLimitFileSize,
  toAssessmentDto,
} from "./marketAccessRoutes.js";
import { isAssessmentUuid } from "../services/marketAccessAssessmentService.js";

describe("classifyPackageFiles", () => {
  it("requires exactly one file field named file", () => {
    expect(classifyPackageFiles(undefined)).toMatchObject({
      code: "missing_package_file",
    });
    expect(classifyPackageFiles([])).toMatchObject({
      code: "missing_package_file",
    });
    expect(classifyPackageFiles([{ fieldname: "file" }])).toEqual({ ok: true });
    expect(
      classifyPackageFiles([{ fieldname: "file" }, { fieldname: "extra" }]),
    ).toMatchObject({ code: "invalid_upload" });
    expect(classifyPackageFiles([{ fieldname: "package" }])).toMatchObject({
      code: "invalid_upload",
    });
  });
});

describe("isMulterLimitFileSize", () => {
  it("maps Multer LIMIT_FILE_SIZE to the 413 path", () => {
    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    expect(isMulterLimitFileSize(err)).toBe(true);
    expect(isMulterLimitFileSize(new Error("other"))).toBe(false);
  });
});

describe("isAssessmentUuid", () => {
  it("accepts standard UUIDs and rejects other ids", () => {
    expect(isAssessmentUuid("2c1b6d5e-3f4a-4b8c-9d0e-1f2a3b4c5d6e")).toBe(true);
    expect(isAssessmentUuid("not-a-uuid")).toBe(false);
    expect(isAssessmentUuid("example-product")).toBe(false);
  });
});

describe("toAssessmentDto", () => {
  it("exposes original file metadata without stored paths", () => {
    const dto = toAssessmentDto({
      schemaVersion: 1,
      id: "2c1b6d5e-3f4a-4b8c-9d0e-1f2a3b4c5d6e",
      productName: "Example Product",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
      package: {
        originalFileName: "brief.pptx",
        storedFileName: "brief.pptx",
        fileSize: 12,
        format: "pptx",
      },
    });
    expect(dto).toEqual({
      id: "2c1b6d5e-3f4a-4b8c-9d0e-1f2a3b4c5d6e",
      productName: "Example Product",
      createdAt: "2026-08-31T00:00:00.000Z",
      packageFile: {
        fileName: "brief.pptx",
        fileSize: 12,
        format: "pptx",
      },
    });
    expect(JSON.stringify(dto)).not.toMatch(/sources\//);
  });
});
