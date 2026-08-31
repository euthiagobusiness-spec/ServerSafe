export type StorageKey = string & { readonly __brand: "StorageKey" };
export type StorageOwnerId = string & { readonly __brand: "StorageOwnerId" };
export type StorageDocumentId = string & { readonly __brand: "StorageDocumentId" };
export type StorageVersionId = string & { readonly __brand: "StorageVersionId" };
export type Sha256Checksum = string & { readonly __brand: "Sha256Checksum" };
export type MultipartUploadId = string & { readonly __brand: "MultipartUploadId" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function normalizeIdentifier(value: string, errorCode: string) {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw new Error(errorCode);
  return normalized;
}

export function storageOwnerId(value: string): StorageOwnerId {
  return normalizeIdentifier(value, "STORAGE_OWNER_ID_INVALID") as StorageOwnerId;
}

export function storageDocumentId(value: string): StorageDocumentId {
  return normalizeIdentifier(value, "STORAGE_DOCUMENT_ID_INVALID") as StorageDocumentId;
}

export function storageVersionId(value: string): StorageVersionId {
  return normalizeIdentifier(value, "STORAGE_VERSION_ID_INVALID") as StorageVersionId;
}

export function storageChecksum(value: string): Sha256Checksum {
  const normalized = value.trim().toLowerCase();
  if (!SHA256_PATTERN.test(normalized)) throw new Error("STORAGE_CHECKSUM_INVALID");
  return normalized as Sha256Checksum;
}

export type StorageLocator = Readonly<{
  ownerId: StorageOwnerId;
  documentId: StorageDocumentId;
  versionId: StorageVersionId;
  key: StorageKey;
}>;

/**
 * Creates the only object locator accepted by the provider boundary. The key
 * is derived from validated UUIDs; callers never provide an object key.
 * Authorization of ownerId remains the responsibility of the authenticated
 * service layer that creates this locator.
 */
export function createStorageLocator(input: {
  ownerId: StorageOwnerId;
  documentId: StorageDocumentId;
  versionId: StorageVersionId;
}): StorageLocator {
  const ownerId = storageOwnerId(input.ownerId);
  const documentId = storageDocumentId(input.documentId);
  const versionId = storageVersionId(input.versionId);
  const key = `owners/${ownerId}/documents/${documentId}/versions/${versionId}` as StorageKey;
  return { ownerId, documentId, versionId, key };
}

export type StorageObjectDescriptor = Readonly<{
  locator: StorageLocator;
  contentType: string;
  sizeBytes: number;
  checksum: Sha256Checksum;
}>;

export type StorageObjectMetadata = StorageObjectDescriptor & {
  etag?: string;
  createdAt: string;
};

export type StorageObject = {
  metadata: StorageObjectMetadata;
  body: AsyncIterable<Uint8Array>;
};

export type WriteCondition =
  | { type: "if-absent" }
  | { type: "if-match"; etag: string };

export type DeleteCondition = { type: "if-match"; etag: string };

export type PutObjectInput = StorageObjectDescriptor & {
  body: AsyncIterable<Uint8Array> | Uint8Array;
  condition: WriteCondition;
};

export type UploadTarget = {
  method: "PUT" | "POST";
  url: string;
  headers: Readonly<Record<string, string>>;
  expiresAt: string;
};

export type DownloadTarget = {
  url: string;
  expiresAt: string;
};

export type SignedUploadInput = StorageObjectDescriptor & {
  expiresInSeconds: number;
  condition: WriteCondition;
};

export type MultipartUploadSession = Readonly<{
  uploadId: MultipartUploadId;
  locator: StorageLocator;
  partSizeBytes: number;
  expiresAt: string;
}>;

export type MultipartPart = Readonly<{
  partNumber: number;
  etag: string;
  sizeBytes: number;
  checksum: Sha256Checksum;
}>;

export interface StorageProvider {
  put(input: PutObjectInput): Promise<StorageObjectMetadata>;
  get(locator: StorageLocator): Promise<StorageObject | null>;
  head(locator: StorageLocator): Promise<StorageObjectMetadata | null>;
  delete(input: { locator: StorageLocator; condition: DeleteCondition }): Promise<void>;
  createUploadTarget(input: SignedUploadInput): Promise<UploadTarget>;
  createDownloadTarget(input: {
    locator: StorageLocator;
    expiresInSeconds: number;
  }): Promise<DownloadTarget>;
  createMultipartUpload(input: SignedUploadInput & {
    partSizeBytes: number;
  }): Promise<MultipartUploadSession>;
  createUploadPartTarget(input: {
    uploadId: MultipartUploadId;
    locator: StorageLocator;
    partNumber: number;
    sizeBytes: number;
    checksum: Sha256Checksum;
    expiresInSeconds: number;
  }): Promise<UploadTarget>;
  completeMultipartUpload(input: {
    uploadId: MultipartUploadId;
    locator: StorageLocator;
    parts: ReadonlyArray<MultipartPart>;
    checksum: Sha256Checksum;
    condition: WriteCondition;
  }): Promise<StorageObjectMetadata>;
  abortMultipartUpload(input: {
    uploadId: MultipartUploadId;
    locator: StorageLocator;
  }): Promise<void>;
}
