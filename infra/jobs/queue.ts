import { randomUUID } from "node:crypto";
import { DocumentPlatformError } from "../documents/errors";
import type { JobId } from "../documents/domain";
import {
  assertWorkerJobEnvelope,
  type WorkerJobEnvelope,
} from "../workers/contracts";

export type QueueReservation = Readonly<{
  reservationId: string;
  queueName: string;
  envelope: WorkerJobEnvelope;
  leaseUntil: string;
}>;

export type QueueRetryInput = Readonly<{
  availableAt: string;
  errorCode: string;
}>;

export type DeadLetter = Readonly<{
  queueName: string;
  envelope: WorkerJobEnvelope;
  errorCode: string;
  failedAt: string;
}>;

export interface JobQueue {
  enqueue(queueName: string, envelope: WorkerJobEnvelope, availableAt?: string): Promise<void>;
  reserve(queueName: string, leaseSeconds?: number): Promise<QueueReservation | null>;
  ack(reservation: QueueReservation): Promise<void>;
  retry(reservation: QueueReservation, input: QueueRetryInput): Promise<void>;
  fail(reservation: QueueReservation, errorCode: string): Promise<void>;
  heartbeat(reservation: QueueReservation, leaseUntil: string): Promise<QueueReservation>;
  cancel(input: { reservationId?: string; jobId?: JobId }): Promise<void>;
}

/**
 * Command surface expected from a Valkey implementation. An adapter can map
 * these operations to atomic Lua scripts or transactions without exposing a
 * Redis/Valkey client or credentials to the infrastructure domain.
 */
export interface ValkeyQueueCommandExecutor {
  enqueue(queueName: string, envelope: WorkerJobEnvelope, availableAt: string): Promise<void>;
  reserve(queueName: string, leaseUntil: string): Promise<QueueReservation | null>;
  ack(reservationId: string): Promise<void>;
  retry(reservationId: string, availableAt: string, errorCode: string): Promise<void>;
  fail(reservationId: string, errorCode: string): Promise<void>;
  heartbeat(reservationId: string, leaseUntil: string): Promise<QueueReservation>;
  cancel(input: { reservationId?: string; jobId?: JobId }): Promise<void>;
}

/** Provider adapter. No remote command is made until an executor is injected. */
export class ValkeyQueueAdapter implements JobQueue {
  constructor(private readonly executor: ValkeyQueueCommandExecutor, private readonly now: () => Date = () => new Date()) {}

  enqueue(queueName: string, envelope: WorkerJobEnvelope, availableAt = this.now().toISOString()) {
    const checked = assertWorkerJobEnvelope(envelope);
    if (checked.status !== "queued" || checked.attempt >= checked.maxAttempts) {
      throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID");
    }
    return this.executor.enqueue(this.queue(queueName), checked, this.timestamp(availableAt));
  }

  reserve(queueName: string, leaseSeconds = 60) {
    const seconds = this.leaseSeconds(leaseSeconds);
    return this.executor.reserve(this.queue(queueName), new Date(this.now().getTime() + seconds * 1000).toISOString());
  }

  ack(reservation: QueueReservation) {
    return this.executor.ack(this.reservation(reservation).reservationId);
  }

  retry(reservation: QueueReservation, input: QueueRetryInput) {
    const checked = this.reservation(reservation);
    return this.executor.retry(checked.reservationId, this.timestamp(input.availableAt), this.errorCode(input.errorCode));
  }

  fail(reservation: QueueReservation, errorCode: string) {
    return this.executor.fail(this.reservation(reservation).reservationId, this.errorCode(errorCode));
  }

  heartbeat(reservation: QueueReservation, leaseUntil: string) {
    const checked = this.reservation(reservation);
    return this.executor.heartbeat(checked.reservationId, this.timestamp(leaseUntil));
  }

  cancel(input: { reservationId?: string; jobId?: JobId }) {
    return this.executor.cancel(input);
  }

  private reservation(value: QueueReservation) {
    if (!value || typeof value.reservationId !== "string" || !value.reservationId) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    assertWorkerJobEnvelope(value.envelope);
    return value;
  }

  private queue(value: string) {
    const queue = value.trim();
    if (!/^[a-z][a-z0-9._-]{0,63}$/.test(queue)) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    return queue;
  }

  private leaseSeconds(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 300) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    return value;
  }

  private timestamp(value: string) {
    if (Number.isNaN(Date.parse(value))) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    return new Date(value).toISOString();
  }

  private errorCode(value: string) {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 64);
    return normalized || "QUEUE_FAILED";
  }
}

type QueueEntry = {
  id: string;
  queueName: string;
  envelope: WorkerJobEnvelope;
  availableAt: string;
  reservationId: string | null;
  leaseUntil: string | null;
};

/** Deterministic local adapter used by tests and offline worker simulations. */
export class InMemoryValkeyQueue implements JobQueue {
  private readonly entries = new Map<string, QueueEntry>();
  private readonly idempotency = new Map<string, string>();
  private readonly letters: DeadLetter[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  async enqueue(queueName: string, value: WorkerJobEnvelope, availableAt = this.now().toISOString()) {
    const queue = this.queue(queueName);
    const envelope = assertWorkerJobEnvelope(value);
    if (envelope.status !== "queued" || envelope.attempt >= envelope.maxAttempts) {
      throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID");
    }
    const dedupeKey = `${queue}:${envelope.ownerId}:${envelope.idempotencyKey}`;
    if (this.idempotency.has(dedupeKey)) return;
    const id = randomUUID();
    this.idempotency.set(dedupeKey, id);
    this.entries.set(id, {
      id,
      queueName: queue,
      envelope,
      availableAt: this.timestamp(availableAt),
      reservationId: null,
      leaseUntil: null,
    });
  }

  async reserve(queueName: string, leaseSeconds = 60): Promise<QueueReservation | null> {
    const queue = this.queue(queueName);
    if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) {
      throw new DocumentPlatformError("JOB_LEASE_INVALID");
    }
    const now = this.now().getTime();
    const entry = [...this.entries.values()]
      .filter((candidate) => candidate.queueName === queue)
      .filter((candidate) => this.reclaim(candidate, now))
      .filter((candidate) => Date.parse(candidate.availableAt) <= now)
      .sort((left, right) => left.availableAt.localeCompare(right.availableAt) || left.id.localeCompare(right.id))[0];
    if (!entry) return null;
    if (entry.envelope.attempt >= entry.envelope.maxAttempts) {
      this.entries.delete(entry.id);
      this.letters.push({
        queueName: entry.queueName,
        envelope: entry.envelope,
        errorCode: "MAX_ATTEMPTS_EXCEEDED",
        failedAt: this.now().toISOString(),
      });
      return this.reserve(queue, leaseSeconds);
    }
    const reservationId = randomUUID();
    const leaseUntil = new Date(now + leaseSeconds * 1000).toISOString();
    entry.reservationId = reservationId;
    entry.leaseUntil = leaseUntil;
    return this.reservation(entry);
  }

  async ack(reservation: QueueReservation) {
    const entry = this.entry(reservation);
    this.entries.delete(entry.id);
  }

  async retry(reservation: QueueReservation, input: QueueRetryInput) {
    const entry = this.entry(reservation);
    entry.availableAt = this.timestamp(input.availableAt);
    entry.reservationId = null;
    entry.leaseUntil = null;
  }

  async fail(reservation: QueueReservation, errorCode: string) {
    const entry = this.entry(reservation);
    this.entries.delete(entry.id);
    this.letters.push({
      queueName: entry.queueName,
      envelope: entry.envelope,
      errorCode: this.errorCode(errorCode),
      failedAt: this.now().toISOString(),
    });
  }

  async heartbeat(reservation: QueueReservation, leaseUntil: string) {
    const entry = this.entry(reservation);
    const nextLease = this.timestamp(leaseUntil);
    if (Date.parse(nextLease) <= this.now().getTime()) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    entry.leaseUntil = nextLease;
    return this.reservation(entry);
  }

  async cancel(input: { reservationId?: string; jobId?: JobId }) {
    const entry = [...this.entries.values()].find((candidate) =>
      (input.reservationId !== undefined && candidate.reservationId === input.reservationId) ||
      (input.jobId !== undefined && candidate.envelope.jobId === input.jobId));
    if (!entry) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    this.entries.delete(entry.id);
  }

  deadLetters() {
    return [...this.letters];
  }

  size() {
    return this.entries.size;
  }

  private entry(reservation: QueueReservation) {
    if (!reservation || typeof reservation.reservationId !== "string") throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    const entry = [...this.entries.values()].find((candidate) => candidate.reservationId === reservation.reservationId);
    if (!entry) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    if (!entry.leaseUntil || Date.parse(entry.leaseUntil) <= this.now().getTime()) {
      entry.reservationId = null;
      entry.leaseUntil = null;
      throw new DocumentPlatformError("QUEUE_LEASE_EXPIRED");
    }
    return entry;
  }

  private reservation(entry: QueueEntry): QueueReservation {
    if (!entry.reservationId || !entry.leaseUntil) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    return {
      reservationId: entry.reservationId,
      queueName: entry.queueName,
      envelope: entry.envelope,
      leaseUntil: entry.leaseUntil,
    };
  }

  private reclaim(entry: QueueEntry, now: number) {
    if (entry.leaseUntil !== null && Date.parse(entry.leaseUntil) <= now) {
      entry.reservationId = null;
      entry.leaseUntil = null;
    }
    return entry.reservationId === null;
  }

  private queue(value: string) {
    const queue = value.trim();
    if (!/^[a-z][a-z0-9._-]{0,63}$/.test(queue)) throw new DocumentPlatformError("QUEUE_JOB_NOT_FOUND");
    return queue;
  }

  private timestamp(value: string) {
    if (Number.isNaN(Date.parse(value))) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    return new Date(value).toISOString();
  }

  private errorCode(value: string) {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 64);
    return normalized || "QUEUE_FAILED";
  }
}
