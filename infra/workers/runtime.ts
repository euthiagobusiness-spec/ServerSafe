import { DocumentPlatformError } from "../documents/errors";
import {
  assertTrustedDocumentContext,
  type JobId,
  type TrustedDocumentContext,
} from "../documents/domain";
import { JobService, type JobRecord } from "../jobs/service";
import {
  type JobQueue,
  type QueueReservation,
} from "../jobs/queue";
import {
  assertWorkerJobEnvelope,
  type WorkerJobType,
} from "./contracts";

export type WorkerHandlerInput = Readonly<{
  context: TrustedDocumentContext;
  job: JobRecord;
}>;

export type WorkerHandler = (input: WorkerHandlerInput) => Promise<void>;

export type WorkerRunResult =
  | { status: "idle" }
  | { status: "completed"; jobId: JobId }
  | { status: "retried"; jobId: JobId; errorCode: string }
  | { status: "failed"; jobId: JobId | null; errorCode: string };

export type WorkerContextResolver = (jobId: JobId) => Promise<TrustedDocumentContext>;

/**
 * Minimal metadata-only worker loop. The queue envelope is treated as an
 * untrusted hint; official job state and a separately authorized context are
 * always fetched before a handler is called.
 */
export class DocumentWorkerRuntime {
  constructor(
    private readonly queue: JobQueue,
    private readonly jobs: JobService,
    private readonly resolveContext: WorkerContextResolver,
    private readonly handlers: Readonly<Partial<Record<WorkerJobType, WorkerHandler>>>,
  ) {}

  async runOnce(queueName: string): Promise<WorkerRunResult> {
    const reservation = await this.queue.reserve(queueName);
    if (!reservation) return { status: "idle" };
    let jobId: JobId | null = null;
    try {
      const envelope = assertWorkerJobEnvelope(reservation.envelope);
      jobId = envelope.jobId;
      const context = assertTrustedDocumentContext(await this.resolveContext(envelope.jobId));
      const official = await this.jobs.get(context, envelope.jobId);
      if (!official || official.status !== "queued" || !this.matches(official, envelope)) {
        await this.queue.fail(reservation, "WORKER_ENVELOPE_MISMATCH");
        return { status: "failed", jobId, errorCode: "WORKER_ENVELOPE_MISMATCH" };
      }
      const handler = this.handlers[official.type];
      if (!handler) {
        await this.failReservation(reservation, context, official, "WORKER_HANDLER_UNAVAILABLE", false);
        return { status: "failed", jobId, errorCode: "WORKER_HANDLER_UNAVAILABLE" };
      }
      const processing = await this.jobs.startProcessing(context, official.jobId, reservation.leaseUntil);
      if (!processing) throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
      try {
        await handler({ context, job: processing });
        const completed = await this.jobs.complete(context, official.jobId);
        if (!completed) throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
        await this.queue.ack(reservation);
        return { status: "completed", jobId };
      } catch (error) {
        const errorCode = this.normalizeError(error);
        const retryable = this.retryable(error);
        const failed = await this.jobs.fail(context, official.jobId, errorCode, retryable);
        if (!failed) throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
        if (failed.status === "queued") {
          await this.queue.retry(reservation, { availableAt: failed.availableAt, errorCode });
          return { status: "retried", jobId, errorCode };
        }
        await this.queue.fail(reservation, errorCode);
        return { status: "failed", jobId, errorCode };
      }
    } catch (error) {
      const errorCode = this.normalizeError(error);
      await this.safeFail(reservation, errorCode);
      return { status: "failed", jobId, errorCode };
    }
  }

  async heartbeat(reservation: QueueReservation, context: TrustedDocumentContext, leaseUntil: string) {
    const trustedContext = assertTrustedDocumentContext(context);
    const envelope = assertWorkerJobEnvelope(reservation.envelope);
    const official = await this.jobs.get(trustedContext, envelope.jobId);
    if (!official || !this.matches(official, envelope) || official.status !== "processing") {
      throw new DocumentPlatformError("WORKER_ENVELOPE_MISMATCH");
    }
    const updatedReservation = await this.queue.heartbeat(reservation, leaseUntil);
    const updatedJob = await this.jobs.heartbeat(trustedContext, official.jobId, updatedReservation.leaseUntil);
    if (!updatedJob) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    return updatedReservation;
  }

  private matches(job: JobRecord, envelope: ReturnType<typeof assertWorkerJobEnvelope>) {
    return job.ownerId === envelope.ownerId &&
      job.documentId === envelope.documentId &&
      job.versionId === envelope.versionId &&
      job.type === envelope.operation &&
      job.idempotencyKey === envelope.idempotencyKey &&
      job.payload.ownerId === envelope.payload.ownerId &&
      job.payload.documentId === envelope.payload.documentId &&
      job.payload.versionId === envelope.payload.versionId &&
      job.payload.operation === envelope.payload.operation;
  }

  private async failReservation(
    reservation: QueueReservation,
    context: TrustedDocumentContext,
    job: JobRecord,
    errorCode: string,
    retryable: boolean,
  ) {
    const failed = await this.jobs.startProcessing(context, job.jobId, reservation.leaseUntil);
    if (failed) await this.jobs.fail(context, job.jobId, errorCode, retryable);
    await this.queue.fail(reservation, errorCode);
  }

  private async safeFail(reservation: QueueReservation, errorCode: string) {
    try { await this.queue.fail(reservation, errorCode); } catch { /* queue failures stay internal */ }
  }

  private normalizeError(error: unknown) {
    if (error instanceof DocumentPlatformError) return error.code;
    return "WORKER_HANDLER_FAILED";
  }

  private retryable(error: unknown) {
    return !(error instanceof DocumentPlatformError) || error.code === "QUEUE_LEASE_EXPIRED";
  }

}
