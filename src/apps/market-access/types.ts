import type { PackageFormat } from "./packageFile";

/** Package document metadata — not the File blob or a filesystem path. */
export interface PackageFileMetadata {
  fileName: string;
  fileSize: number;
  format: PackageFormat;
}

/** Assessment view-model. Same shape as the HTTP JSON. */
export interface Assessment {
  id: string;
  productName: string;
  createdAt: string;
  packageFile: PackageFileMetadata;
}

/** Create-form payload. Server derives stored name, size, and format. */
export interface CreateAssessmentInput {
  productName: string;
  file: File;
}
