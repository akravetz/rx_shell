import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  getPackageFormat as getClientPackageFormat,
  PACKAGE_FILE_ACCEPT,
  MAX_PRODUCT_NAME_LENGTH as CLIENT_MAX_PRODUCT_NAME_LENGTH,
  MAX_PACKAGE_FILE_SIZE_BYTES as CLIENT_MAX_PACKAGE_FILE_SIZE_BYTES,
} from "../../src/apps/market-access/packageFile";
import {
  MarketAccessAssessmentService,
  MarketAccessServiceError,
  KNOWLEDGE_DIR,
  MAX_PACKAGE_FILE_SIZE_BYTES,
  MAX_PRODUCT_NAME_LENGTH,
  MAX_SLUG_LENGTH,
  PACKAGE_FORMAT_BY_EXTENSION,
  SOURCES_DIR,
  getPackageFormat,
  resolveAssessmentsRoot,
  sanitizePackageFileName,
  slugFromProductName,
} from "./marketAccessAssessmentService.js";

function tmpRoot(): string {
  return path.join(
    process.cwd(),
    ".test-tmp",
    `ma-assessments-${crypto.randomBytes(4).toString("hex")}`,
  );
}

function writeCorrupt(dir: string, name: string, contents: string): void {
  const assessmentDir = path.join(dir, name);
  mkdirSync(assessmentDir, { recursive: true });
  writeFileSync(path.join(assessmentDir, "assessment.json"), contents, "utf-8");
}

describe("resolveAssessmentsRoot", () => {
  it("uses the repo .local default when the env var is unset", () => {
    expect(resolveAssessmentsRoot("/workspaces/ai_shell", undefined)).toBe(
      path.join("/workspaces/ai_shell", ".local", "market-access", "assessments"),
    );
  });

  it("honors an absolute override", () => {
    expect(resolveAssessmentsRoot("/workspaces/ai_shell", "/data/assessments")).toBe(
      "/data/assessments",
    );
  });

  it("rejects empty and relative overrides without resolving onto cwd", () => {
    expect(() => resolveAssessmentsRoot("/repo", "")).toThrow(MarketAccessServiceError);
    expect(() => resolveAssessmentsRoot("/repo", "   ")).toThrow(MarketAccessServiceError);
    expect(() => resolveAssessmentsRoot("/repo", "relative/path")).toThrow(
      MarketAccessServiceError,
    );
    try {
      resolveAssessmentsRoot("/repo", "relative/path");
    } catch (err) {
      expect(err).toBeInstanceOf(MarketAccessServiceError);
      expect((err as MarketAccessServiceError).code).toBe("storage_unavailable");
      expect((err as Error).message).not.toMatch(/relative\/path/);
    }
  });
});

describe("package format allowlist alignment", () => {
  it("keeps client and server extensions and limits equal", () => {
    const serverExts = Object.keys(PACKAGE_FORMAT_BY_EXTENSION).sort();
    const clientExts = PACKAGE_FILE_ACCEPT.split(",")
      .map((item) => item.replace(/^\./, ""))
      .sort();
    expect(serverExts).toEqual(clientExts);
    expect(MAX_PRODUCT_NAME_LENGTH).toBe(CLIENT_MAX_PRODUCT_NAME_LENGTH);
    expect(MAX_PACKAGE_FILE_SIZE_BYTES).toBe(CLIENT_MAX_PACKAGE_FILE_SIZE_BYTES);
  });

  it("maps the same extensions to the same formats, including pptx", () => {
    for (const [ext, format] of Object.entries(PACKAGE_FORMAT_BY_EXTENSION)) {
      expect(getPackageFormat(`file.${ext}`)).toBe(format);
      expect(getClientPackageFormat(`file.${ext}`)).toBe(format);
    }
  });

  it("rejects .ppt, .pdf, and .doc on both allowlists", () => {
    for (const name of ["deck.ppt", "brief.pdf", "old.doc"]) {
      expect(getPackageFormat(name)).toBeNull();
      expect(getClientPackageFormat(name)).toBeNull();
    }
  });
});

describe("slugFromProductName", () => {
  it("slugifies and caps at 80 characters before collision suffixes", () => {
    expect(slugFromProductName("Example Product (alpha)", "id")).toBe(
      "example-product-alpha",
    );
    expect(slugFromProductName("A".repeat(100), "id").length).toBe(MAX_SLUG_LENGTH);
    expect(slugFromProductName("!!!", "fallback-id")).toBe("fallback-id");
  });
});

describe("sanitizePackageFileName", () => {
  it("strips posix and Windows path prefixes", () => {
    expect(sanitizePackageFileName("../foo.pptx")).toBe("foo.pptx");
    expect(sanitizePackageFileName("foo/bar.md")).toBe("bar.md");
    expect(sanitizePackageFileName("C:\\Users\\a\\brief.docx")).toBe("brief.docx");
  });

  it("rejects empty, dot, and control-character names", () => {
    expect(sanitizePackageFileName(".")).toBeNull();
    expect(sanitizePackageFileName("..")).toBeNull();
    expect(sanitizePackageFileName("")).toBeNull();
    expect(sanitizePackageFileName("a\nb.md")).toBeNull();
  });
});

describe("MarketAccessAssessmentService", () => {
  let root: string;
  let svc: MarketAccessAssessmentService;

  beforeEach(() => {
    root = tmpRoot();
    mkdirSync(root, { recursive: true });
    svc = new MarketAccessAssessmentService(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("create", () => {
    it("writes assessment.json, an unchanged sources copy, and empty knowledge/", async () => {
      const bytes = Buffer.from("hello-pptx");
      const record = await svc.create({
        productName: "  Example Product  ",
        originalFileName: "brief.pptx",
        bytes,
      });

      expect(record.schemaVersion).toBe(1);
      expect(record.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(record.productName).toBe("Example Product");
      expect(record.package.format).toBe("pptx");
      expect(record.package.fileSize).toBe(bytes.length);

      const dir = path.join(root, "example-product");
      const stored = path.join(dir, SOURCES_DIR, "brief.pptx");
      const knowledgeDir = path.join(dir, KNOWLEDGE_DIR);
      expect(existsSync(path.join(dir, "assessment.json"))).toBe(true);
      expect(existsSync(stored)).toBe(true);
      expect(readFileSync(stored)).toEqual(bytes);
      expect(existsSync(knowledgeDir)).toBe(true);
      expect(readdirSync(knowledgeDir)).toEqual([]);
      expect(readdirSync(dir).sort()).toEqual([
        "assessment.json",
        KNOWLEDGE_DIR,
        SOURCES_DIR,
      ]);
    });

    it("retries EEXIST with a -2 slug suffix", async () => {
      await svc.create({
        productName: "Widget",
        originalFileName: "a.md",
        bytes: Buffer.from("one"),
      });
      const second = await svc.create({
        productName: "Widget",
        originalFileName: "b.md",
        bytes: Buffer.from("two"),
      });

      expect(existsSync(path.join(root, "widget", "assessment.json"))).toBe(true);
      expect(existsSync(path.join(root, "widget-2", "assessment.json"))).toBe(
        true,
      );
      expect(second.id).not.toBe(
        JSON.parse(readFileSync(path.join(root, "widget", "assessment.json"), "utf-8"))
          .id,
      );
    });

    it("rejects blank and overlong product names", async () => {
      await expect(
        svc.create({
          productName: "   ",
          originalFileName: "a.md",
          bytes: Buffer.from("x"),
        }),
      ).rejects.toMatchObject({ code: "invalid_product_name" });

      await expect(
        svc.create({
          productName: "a".repeat(MAX_PRODUCT_NAME_LENGTH + 1),
          originalFileName: "a.md",
          bytes: Buffer.from("x"),
        }),
      ).rejects.toMatchObject({ code: "invalid_product_name" });
    });

    it("rejects files over the 20 MiB cap", async () => {
      await expect(
        svc.create({
          productName: "Big",
          originalFileName: "a.md",
          bytes: Buffer.alloc(MAX_PACKAGE_FILE_SIZE_BYTES + 1),
        }),
      ).rejects.toMatchObject({ code: "file_too_large" });
    });

    it("rejects unsupported package types", async () => {
      await expect(
        svc.create({
          productName: "Drug",
          originalFileName: "deck.ppt",
          bytes: Buffer.from("x"),
        }),
      ).rejects.toMatchObject({ code: "unsupported_package_type" });
    });

    it("sanitizes uploaded path-like names", async () => {
      const record = await svc.create({
        productName: "Pathy",
        originalFileName: "..\\nested\\brief.md",
        bytes: Buffer.from("# ok"),
      });
      expect(record.package.storedFileName).toBe("brief.md");
      expect(
        existsSync(path.join(root, "pathy", SOURCES_DIR, "brief.md")),
      ).toBe(true);
    });

    it("reports storage_unavailable when the root cannot be created", async () => {
      const fileRoot = path.join(root, "not-a-dir");
      writeFileSync(fileRoot, "blocked");
      const blocked = new MarketAccessAssessmentService(fileRoot);
      await expect(
        blocked.create({
          productName: "Drug",
          originalFileName: "a.md",
          bytes: Buffer.from("x"),
        }),
      ).rejects.toMatchObject({ code: "storage_unavailable" });
    });

    it("removes only the new assessment dir when the package write fails", async () => {
      await svc.create({
        productName: "Keep Me",
        originalFileName: "keep.md",
        bytes: Buffer.from("keep"),
      });
      const before = readdirSync(root);
      const tooLongName = `${"a".repeat(300)}.md`;

      await expect(
        svc.create({
          productName: "Fail Me",
          originalFileName: tooLongName,
          bytes: Buffer.from("fail"),
        }),
      ).rejects.toMatchObject({ code: "write_failed" });

      expect(readdirSync(root)).toEqual(before);
      expect(existsSync(path.join(root, "keep-me", "assessment.json"))).toBe(
        true,
      );
      expect(existsSync(path.join(root, "fail-me"))).toBe(false);
    });
  });

  describe("list and getById", () => {
    it("lists created assessments and loads by UUID", async () => {
      const created = await svc.create({
        productName: "Listed",
        originalFileName: "notes.markdown",
        bytes: Buffer.from("md"),
      });
      const listed = await svc.list();
      expect(listed.skippedCount).toBe(0);
      expect(listed.assessments).toHaveLength(1);
      expect(listed.assessments[0].id).toBe(created.id);
      expect(await svc.getById(created.id)).toEqual(created);
      expect(await svc.getById(crypto.randomUUID())).toBeNull();
    });

    it("skips corrupt and unknown-schema records", async () => {
      await svc.create({
        productName: "Good",
        originalFileName: "good.md",
        bytes: Buffer.from("ok"),
      });
      writeCorrupt(root, "broken", "{not json");
      writeCorrupt(
        root,
        "future",
        JSON.stringify({
          schemaVersion: 2,
          id: crypto.randomUUID(),
          productName: "Future",
        }),
      );

      const listed = await svc.list();
      expect(listed.assessments).toHaveLength(1);
      expect(listed.assessments[0].productName).toBe("Good");
      expect(listed.skippedCount).toBe(2);
    });

    it("reloads metadata when the package still lives under a legacy source/ dir", async () => {
      const created = await svc.create({
        productName: "Legacy Layout",
        originalFileName: "legacy.md",
        bytes: Buffer.from("legacy"),
      });
      const dir = path.join(root, "legacy-layout");
      renameSync(path.join(dir, SOURCES_DIR), path.join(dir, "source"));

      const listed = await svc.list();
      expect(listed.skippedCount).toBe(0);
      expect(listed.assessments[0].id).toBe(created.id);
      expect(await svc.getById(created.id)).toEqual(created);
    });

    it("returns an empty list when the root does not exist yet", async () => {
      const missing = new MarketAccessAssessmentService(
        path.join(root, "no-such-root"),
      );
      await expect(missing.list()).resolves.toEqual({
        assessments: [],
        skippedCount: 0,
      });
    });
  });
});
