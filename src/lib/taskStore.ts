import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type TaskKind = "create-index" | "add-documents";
export type TaskStatus = "running" | "completed" | "failed";
export type TaskStage =
  | "waiting_file_parse"
  | "creating_index"
  | "submitting_index_job"
  | "submitting_add_documents_job"
  | "waiting_index_job"
  | "deleting_old_document"
  | "completed"
  | "failed";

export type TaskRecord<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> = {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  stage: TaskStage;
  payload: TPayload;
  result: TResult | null;
  error: string | null;
  requestId: string | null;
  indexId: string | null;
  fileId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskRow = Omit<TaskRecord<string, string>, "payload" | "result"> & {
  payload: string;
  result: string | null;
};

let db: Database.Database | null = null;

export function getTaskDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "tasks.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists tasks (
      id text primary key,
      kind text not null,
      status text not null,
      stage text not null,
      payload text not null,
      result text,
      error text,
      requestId text,
      indexId text,
      fileId text,
      jobId text,
      createdAt text not null,
      updatedAt text not null
    );
  `);

  return db;
}

export function createTask(kind: TaskKind, payload: Record<string, unknown>) {
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: randomUUID(),
    kind,
    status: "running",
    stage: "waiting_file_parse",
    payload,
    result: null,
    error: null,
    requestId: null,
    indexId: typeof payload.indexId === "string" ? payload.indexId : null,
    fileId: typeof payload.fileId === "string" ? payload.fileId : null,
    jobId: null,
    createdAt: now,
    updatedAt: now,
  };

  getTaskDb()
    .prepare(
      `insert into tasks
        (id, kind, status, stage, payload, result, error, requestId, indexId, fileId, jobId, createdAt, updatedAt)
       values
        (@id, @kind, @status, @stage, @payload, @result, @error, @requestId, @indexId, @fileId, @jobId, @createdAt, @updatedAt)`,
    )
    .run(serializeTask(task));

  return task;
}

export function getTask(id: string) {
  const row = getTaskDb().prepare("select * from tasks where id = ?").get(id) as TaskRow | undefined;
  return row ? deserializeTask(row) : null;
}

export function listTasks(limit = 20) {
  const rows = getTaskDb()
    .prepare("select * from tasks order by datetime(updatedAt) desc limit ?")
    .all(limit) as TaskRow[];
  return rows.map(deserializeTask);
}

export function updateTask(id: string, patch: Partial<Omit<TaskRecord, "id" | "createdAt">>) {
  const existing = getTask(id);
  if (!existing) return null;

  const next: TaskRecord = {
    ...existing,
    ...patch,
    payload: patch.payload ?? existing.payload,
    result: patch.result === undefined ? existing.result : patch.result,
    updatedAt: new Date().toISOString(),
  };

  getTaskDb()
    .prepare(
      `update tasks set
        kind = @kind,
        status = @status,
        stage = @stage,
        payload = @payload,
        result = @result,
        error = @error,
        requestId = @requestId,
        indexId = @indexId,
        fileId = @fileId,
        jobId = @jobId,
        updatedAt = @updatedAt
       where id = @id`,
    )
    .run(serializeTask(next));

  return next;
}

function serializeTask(task: TaskRecord) {
  return {
    ...task,
    payload: JSON.stringify(task.payload),
    result: task.result ? JSON.stringify(task.result) : null,
  };
}

function deserializeTask(row: TaskRow): TaskRecord {
  return {
    ...row,
    payload: JSON.parse(row.payload),
    result: row.result ? JSON.parse(row.result) : null,
  };
}
