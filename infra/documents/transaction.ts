import { InMemoryJobStore, type JobService } from "../jobs/service";
import { InMemoryUploadIntentStore, type UploadIntentStore } from "./upload-intents";
import { InMemoryDocumentRepository, type DocumentRepository } from "./repository";

export type DocumentTransactionScope = Readonly<{
  repository: DocumentRepository;
  jobs: JobService;
  uploadIntents: UploadIntentStore;
}>;

export interface DocumentUnitOfWork {
  run<T>(operation: (scope: DocumentTransactionScope) => Promise<T>): Promise<T>;
}

/**
 * Atomic test/development unit of work. It snapshots every local participant
 * and restores all of them when any operation fails, including jobs and upload
 * intents. A real adapter must replace this with a database transaction.
 */
export class InMemoryDocumentUnitOfWork implements DocumentUnitOfWork {
  constructor(
    private readonly repository: InMemoryDocumentRepository,
    private readonly jobs: JobService,
    private readonly uploadIntents: InMemoryUploadIntentStore,
  ) {}

  async run<T>(operation: (scope: DocumentTransactionScope) => Promise<T>) {
    const repositoryState = this.repository.captureState();
    const jobState = this.jobs.captureState();
    const uploadIntentState = this.uploadIntents.captureState();
    try {
      return await operation({ repository: this.repository, jobs: this.jobs, uploadIntents: this.uploadIntents });
    } catch (error) {
      this.repository.restoreState(repositoryState);
      this.jobs.restoreState(jobState);
      this.uploadIntents.restoreState(uploadIntentState);
      throw error;
    }
  }
}

/**
 * Explicit boundary for a PostgreSQL-backed implementation. The concrete
 * PostgreSQL unit of work lives under infra/postgres and supplies a real SQL
 * transaction client; no fake transaction is silently used in production.
 */
export function requireDocumentUnitOfWork(unitOfWork: DocumentUnitOfWork | undefined): DocumentUnitOfWork {
  if (!unitOfWork) throw new Error("DOCUMENT_TRANSACTION_BOUNDARY_REQUIRED");
  return unitOfWork;
}

export type StatefulInMemoryJobService = JobService & {
  captureState(): ReturnType<InMemoryJobStore["captureState"]>;
};
