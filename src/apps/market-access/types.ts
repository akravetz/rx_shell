import type { PackageFormat } from "./packageFile";

/**
 * What the UI is allowed to remember about the uploaded document.
 * Not the File blob (too big; gone after refresh) and not a disk path
 * (the browser never has one, and we must not show Linux paths).
 */
export interface PackageFileMetadata {
  fileName: string;
  fileSize: number;
  format: PackageFormat;
}

/**
 * The object every view reads. Same property names as the HTTP JSON
 * so list/create/get can drop the response into React state as-is.
 *
 * Disk uses a richer `AssessmentRecord` (schemaVersion, storedFileName,
 * updatedAt). Routes slim that down to this shape before it leaves
 * the server. Views never see the disk record.
 */
export interface Assessment {
  id: string;
  productName: string;
  createdAt: string;
  packageFile: PackageFileMetadata;
}

/**
 * What the create form hands to the POST. Server derives fileName,
 * fileSize, and format from the File — the client does not send those.
 */
export interface CreateAssessmentInput {
  productName: string;
  file: File;
}
