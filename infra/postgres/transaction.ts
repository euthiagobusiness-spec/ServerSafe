import type { DocumentRepository } from "../documents/repository";
import {
  type DocumentTransactionScope,
  type DocumentUnitOfWork,
} from "../documents/transaction";
import { PostgresDocumentRepository } from "./repository";
import { PostgresUploadIntentStore } from "./upload-intents";
import { PostgresJobStore } from "../jobs/postgres";
import { JobService } from "../jobs/service";
import type { SqlDatabase, SqlTransactionClient } from "./sql";

export type PostgresDocumentUnitOfWorkOptions = Readonly<{
  createRepository?: (client: SqlTransactionClient) => DocumentRepository;
}>;

/**
 * Every scope participant is constructed from the same transaction client.
 * The application service therefore cannot accidentally commit a version,
 * status, job, and upload-intent transition independently.
 */
export class PostgresDocumentUnitOfWork implements DocumentUnitOfWork {
  constructor(
    private readonly database: SqlDatabase,
    private readonly options: PostgresDocumentUnitOfWorkOptions = {},
  ) {}

  async run<T>(operation: (scope: DocumentTransactionScope) => Promise<T>) {
    return this.database.transaction(async (client) => {
      const repository = this.options.createRepository?.(client) ?? new PostgresDocumentRepository(client);
      const jobs = new JobService(repository, new PostgresJobStore(client));
      const uploadIntents = new PostgresUploadIntentStore(client);
      return operation({ repository, jobs, uploadIntents });
    });
  }
}
