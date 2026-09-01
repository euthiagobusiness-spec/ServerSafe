import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants, createReadStream, createWriteStream } from "node:fs";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  createStorageLocator,
  storageChecksum,
  storageDocumentId,
  storageOwnerId,
  storageVersionId,
  type DeleteCondition,
  type DownloadTarget,
  type MultipartUploadSession,
  type PutObjectInput,
  type Sha256Checksum,
  type StorageLocator,
  type StorageObject,
  type StorageObjectDescriptor,
  type StorageObjectMetadata,
  type StorageProvider,
  type UploadTarget,
} from "./storage";
import { DocumentPlatformError } from "../documents/errors";

export const LOCAL_STORAGE_CAPABILITIES = {
  streamPut: true,
  head: true,
  delete: true,
  streamGet: true,
  signedUpload: false,
  signedDownload: false,
  multipart: false,
} as const;

export type LocalStorageEnvironment = "development" | "test";

type LocalStorageOptions = Readonly<{
  rootDirectory: string;
  environment: LocalStorageEnvironment;
  clock?: () => Date;
}>;

type StoredMetadata = StorageObjectMetadata;

type ObjectPaths = Readonly<{
  root: string;
  directories: ReadonlyArray<string>;
  directory: string;
  object: string;
  metadata: string;
}>;

/**
 * Development/test-only object storage. It is deliberately not a production
 * provider: signed and multipart capabilities are reported unsupported.
 */
export class LocalStorageAdapter implements StorageProvider {
  private readonly configuredRootDirectory: string;
  private rootRealPath: string | null = null;
  private rootInitialization: Promise<string> | null = null;
  private readonly clock: () => Date;
  private readonly locks = new Map<string, Promise<void>>();

  constructor(options: LocalStorageOptions) {
    if (options.environment !== "development" && options.environment !== "test") {
      throw new DocumentPlatformError("STORAGE_CAPABILITY_UNSUPPORTED", "Local storage is not production storage");
    }
    if (!options.rootDirectory.trim()) {
      throw new DocumentPlatformError("STORAGE_METADATA_INVALID", "A local storage root is required");
    }
    this.configuredRootDirectory = path.resolve(options.rootDirectory);
    this.clock = options.clock ?? (() => new Date());
  }

  async put(input: PutObjectInput): Promise<StorageObjectMetadata> {
    const descriptor = this.validateDescriptor(input);
    const paths = await this.paths(descriptor.locator);
    return this.withLock(paths.object, async () => {
      await this.ensureDirectory(paths);
      const [objectExists, metadataExists] = await Promise.all([
        this.exists(paths.object),
        this.exists(paths.metadata),
      ]);
      const current = await this.readStoredMetadata(paths, descriptor.locator);
      if (objectExists || metadataExists) {
        if (input.condition.type === "if-absent") {
          throw new DocumentPlatformError("STORAGE_OBJECT_EXISTS");
        }
        if (!current || current.etag !== input.condition.etag) {
          throw new DocumentPlatformError("STORAGE_PRECONDITION_FAILED");
        }
      } else if (input.condition.type === "if-match") {
        throw new DocumentPlatformError("STORAGE_PRECONDITION_FAILED");
      }

      const temporaryObject = path.join(paths.directory, `.object.${randomUUID()}.tmp`);
      const temporaryMetadata = path.join(paths.directory, `.metadata.${randomUUID()}.tmp`);
      try {
        const hash = createHash("sha256");
        let sizeBytes = 0;
        const transform = new Transform({
          transform(chunk: Uint8Array, _encoding, callback) {
            const bytes = Buffer.from(chunk);
            sizeBytes += bytes.byteLength;
            hash.update(bytes);
            callback(null, bytes);
          },
        });
        const body = input.body instanceof Uint8Array ? [input.body] : input.body;
        await pipeline(
          Readable.from(body),
          transform,
          createWriteStream(temporaryObject, { flags: "wx", mode: 0o600 }),
        );
        await chmod(temporaryObject, 0o600);
        const checksum = hash.digest("hex");
        if (sizeBytes !== descriptor.sizeBytes || checksum !== descriptor.checksum) {
          throw new DocumentPlatformError("STORAGE_METADATA_INVALID", "Object size or checksum does not match metadata");
        }
        const metadata: StoredMetadata = {
          ...descriptor,
          etag: descriptor.checksum,
          createdAt: this.clock().toISOString(),
        };
        await writeJsonFile(temporaryMetadata, metadata);
        const installWithoutOverwrite = !objectExists && !metadataExists;
        if (installWithoutOverwrite) {
          await copyFile(temporaryObject, paths.object, fsConstants.COPYFILE_EXCL);
          await unlink(temporaryObject);
          try {
            await copyFile(temporaryMetadata, paths.metadata, fsConstants.COPYFILE_EXCL);
            await unlink(temporaryMetadata);
          } catch (error) {
            await unlink(paths.object).catch(() => undefined);
            throw error;
          }
        } else {
          await rename(temporaryMetadata, paths.metadata);
          await rename(temporaryObject, paths.object);
        }
        await this.assertSafeFinalPath(paths.object, paths);
        await this.assertSafeFinalPath(paths.metadata, paths);
        return metadata;
      } catch (error) {
        await unlink(temporaryObject).catch(() => undefined);
        await unlink(temporaryMetadata).catch(() => undefined);
        throw error;
      }
    });
  }

  async get(locator: StorageLocator): Promise<StorageObject | null> {
    const validated = this.validateLocator(locator);
    const paths = await this.paths(validated);
    const metadata = await this.readStoredMetadata(paths, validated);
    if (!metadata) return null;
    await this.assertSafeFinalPath(paths.object, paths);
    return { metadata, body: createReadStream(paths.object) };
  }

  async head(locator: StorageLocator): Promise<StorageObjectMetadata | null> {
    const validated = this.validateLocator(locator);
    return this.readStoredMetadata(await this.paths(validated), validated);
  }

  async delete(input: { locator: StorageLocator; condition: DeleteCondition }): Promise<void> {
    const validated = this.validateLocator(input.locator);
    const paths = await this.paths(validated);
    await this.withLock(paths.object, async () => {
      const current = await this.readStoredMetadata(paths, validated);
      if (!current) return;
      if (current.etag !== input.condition.etag) {
        throw new DocumentPlatformError("STORAGE_PRECONDITION_FAILED");
      }
      await this.assertSafeFinalPath(paths.object, paths);
      await this.assertSafeFinalPath(paths.metadata, paths);
      await unlink(paths.object).catch((error: unknown) => {
        if (!isNotFound(error)) throw error;
      });
      await unlink(paths.metadata).catch((error: unknown) => {
        if (!isNotFound(error)) throw error;
      });
    });
  }

  async createUploadTarget(): Promise<UploadTarget> {
    throw unsupported("signed upload targets");
  }

  async createDownloadTarget(): Promise<DownloadTarget> {
    throw unsupported("signed download targets");
  }

  async createMultipartUpload(): Promise<MultipartUploadSession> {
    throw unsupported("multipart uploads");
  }

  async createUploadPartTarget(): Promise<UploadTarget> {
    throw unsupported("multipart upload parts");
  }

  async completeMultipartUpload(): Promise<StorageObjectMetadata> {
    throw unsupported("multipart uploads");
  }

  async abortMultipartUpload(): Promise<void> {
    throw unsupported("multipart uploads");
  }

  private validateDescriptor(input: PutObjectInput): StorageObjectDescriptor {
    const locator = this.validateLocator(input.locator);
    let checksum: Sha256Checksum;
    try {
      checksum = storageChecksum(input.checksum);
    } catch {
      throw new DocumentPlatformError("STORAGE_METADATA_INVALID");
    }
    if (!input.contentType.trim() || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
      throw new DocumentPlatformError("STORAGE_METADATA_INVALID");
    }
    return { locator, contentType: input.contentType.trim(), sizeBytes: input.sizeBytes, checksum };
  }

  private validateLocator(locator: StorageLocator): StorageLocator {
    try {
      const validated = createStorageLocator({
        ownerId: storageOwnerId(locator.ownerId),
        documentId: storageDocumentId(locator.documentId),
        versionId: storageVersionId(locator.versionId),
      });
      if (locator.key !== validated.key) throw new Error("STORAGE_KEY_INVALID");
      return validated;
    } catch {
      throw new DocumentPlatformError("STORAGE_METADATA_INVALID", "Storage locator is invalid");
    }
  }

  private async paths(locator: StorageLocator): Promise<ObjectPaths> {
    const root = await this.root();
    const objectsDirectory = path.join(root, "objects");
    const ownerDirectory = path.join(objectsDirectory, locator.ownerId);
    const documentDirectory = path.join(ownerDirectory, locator.documentId);
    const directory = path.join(
      documentDirectory,
      locator.versionId,
    );
    const object = path.join(directory, "object");
    const metadata = path.join(directory, "object.metadata.json");
    this.assertWithinRoot(root, directory);
    this.assertWithinRoot(root, object);
    this.assertWithinRoot(root, metadata);
    return { root, directories: [objectsDirectory, ownerDirectory, documentDirectory, directory], directory, object, metadata };
  }

  private assertWithinRoot(root: string, candidate: string) {
    const relative = path.relative(root, path.resolve(candidate));
    if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new DocumentPlatformError("STORAGE_METADATA_INVALID", "Storage path escapes root");
    }
  }

  private async root() {
    if (this.rootRealPath) return this.rootRealPath;
    if (!this.rootInitialization) {
      this.rootInitialization = (async () => {
        try {
          await mkdir(this.configuredRootDirectory, { recursive: true, mode: 0o700 });
          const rootStat = await lstat(this.configuredRootDirectory);
          if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("STORAGE_ROOT_INVALID");
          const canonical = await realpath(this.configuredRootDirectory);
          const canonicalStat = await lstat(canonical);
          if (!canonicalStat.isDirectory() || canonicalStat.isSymbolicLink()) throw new Error("STORAGE_ROOT_INVALID");
          this.rootRealPath = canonical;
          return canonical;
        } catch {
          throw new DocumentPlatformError("STORAGE_METADATA_INVALID", "Local storage root is not a safe directory");
        }
      })().catch((error: unknown) => {
        this.rootInitialization = null;
        throw error;
      });
    }
    return this.rootInitialization;
  }

  private async ensureDirectory(paths: ObjectPaths) {
    for (const directory of paths.directories) {
      this.assertWithinRoot(paths.root, directory);
      try {
        const info = await lstat(directory);
        if (!info.isDirectory() || info.isSymbolicLink()) throw storagePathError();
      } catch (error) {
        if (!isNotFound(error)) throw storagePathError();
        try {
          await mkdir(directory, { mode: 0o700 });
        } catch (mkdirError) {
          if (!isAlreadyExists(mkdirError)) throw storagePathError();
        }
        const info = await lstat(directory);
        if (!info.isDirectory() || info.isSymbolicLink()) throw storagePathError();
      }
      const canonical = await realpath(directory).catch(() => null);
      if (!canonical) throw storagePathError();
      this.assertWithinRoot(paths.root, canonical);
    }
  }

  private async safeDirectoryExists(paths: ObjectPaths) {
    for (const directory of paths.directories) {
      try {
        const info = await lstat(directory);
        if (!info.isDirectory() || info.isSymbolicLink()) throw storagePathError();
        const canonical = await realpath(directory);
        this.assertWithinRoot(paths.root, canonical);
      } catch (error) {
        if (isNotFound(error)) return false;
        if (error instanceof DocumentPlatformError) throw error;
        return false;
      }
    }
    return true;
  }

  private async assertSafeFinalPath(filePath: string, paths: ObjectPaths) {
    this.assertWithinRoot(paths.root, filePath);
    try {
      const info = await lstat(filePath);
      if (!info.isFile() || info.isSymbolicLink()) throw storagePathError();
      const canonical = await realpath(filePath);
      this.assertWithinRoot(paths.root, canonical);
    } catch (error) {
      if (error instanceof DocumentPlatformError) throw error;
      throw storagePathError();
    }
  }

  private async readStoredMetadata(paths: ObjectPaths, expectedLocator?: StorageLocator): Promise<StoredMetadata | null> {
    if (!(await this.safeDirectoryExists(paths))) return null;
    try {
      const objectStat = await lstat(paths.object);
      if (!objectStat.isFile() || objectStat.isSymbolicLink()) throw storagePathError();
      const metadataStat = await lstat(paths.metadata);
      if (!metadataStat.isFile() || metadataStat.isSymbolicLink()) throw storagePathError();
      this.assertWithinRoot(paths.root, await realpath(paths.object));
      this.assertWithinRoot(paths.root, await realpath(paths.metadata));
      const raw = await readFile(paths.metadata, "utf8");
      const parsed: unknown = JSON.parse(raw);
      const metadata = this.validateStoredMetadata(parsed);
      if (metadata.sizeBytes !== objectStat.size) return null;
      if (
        expectedLocator &&
        (metadata.locator.ownerId !== expectedLocator.ownerId ||
          metadata.locator.documentId !== expectedLocator.documentId ||
          metadata.locator.versionId !== expectedLocator.versionId ||
          metadata.locator.key !== expectedLocator.key)
      ) return null;
      return metadata;
    } catch (error) {
      if (error instanceof DocumentPlatformError) throw error;
      return null;
    }
  }

  private async exists(filePath: string) {
    try {
      const info = await lstat(filePath);
      if (info.isSymbolicLink()) throw storagePathError();
      return true;
    } catch (error) {
      if (error instanceof DocumentPlatformError) throw error;
      return false;
    }
  }

  private validateStoredMetadata(value: unknown): StoredMetadata {
    if (!value || typeof value !== "object") throw new Error("STORAGE_METADATA_INVALID");
    const metadata = value as Record<string, unknown>;
    if (
      typeof metadata.contentType !== "string" ||
      typeof metadata.sizeBytes !== "number" ||
      typeof metadata.checksum !== "string" ||
      typeof metadata.createdAt !== "string" ||
      (metadata.etag !== undefined && typeof metadata.etag !== "string") ||
      !metadata.locator || typeof metadata.locator !== "object"
    ) throw new Error("STORAGE_METADATA_INVALID");
    if (
      !metadata.contentType.trim() ||
      !Number.isSafeInteger(metadata.sizeBytes) ||
      metadata.sizeBytes < 0 ||
      (metadata.etag !== undefined && metadata.etag !== metadata.checksum)
    ) throw new Error("STORAGE_METADATA_INVALID");
    const locator = this.validateLocator(metadata.locator as StorageLocator);
    const checksum = storageChecksum(metadata.checksum);
    return {
      locator,
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      checksum,
      etag: typeof metadata.etag === "string" ? metadata.etag : checksum,
      createdAt: metadata.createdAt,
    };
  }

  private async withLock<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, current);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }
}

async function writeJsonFile(temporary: string, value: unknown) {
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await chmod(temporary, 0o600);
}

function storagePathError() {
  return new DocumentPlatformError("STORAGE_METADATA_INVALID", "Storage path is not a safe regular path");
}

function isAlreadyExists(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST");
}

function unsupported(capability: string) {
  return new DocumentPlatformError("STORAGE_CAPABILITY_UNSUPPORTED", `Local storage does not support ${capability}`);
}

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
