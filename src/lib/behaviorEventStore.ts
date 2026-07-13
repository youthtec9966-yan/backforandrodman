import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { BehaviorEventInput } from "@/lib/behaviorEventValidation";

export type BehaviorEventRecord = {
  id: string;
  sessionId: string;
  conversationId: string | null;
  turnId: string | null;
  traceId: string | null;
  deviceCode: string | null;
  digitalHumanId: string | null;
  source: "android" | "server" | "webview";
  category: string;
  eventName: string;
  timestampMs: number;
  elapsedMs: number | null;
  payload: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  appVersion: string | null;
  networkType: string | null;
  createdAt: string;
};

type BehaviorEventRow = {
  id: string;
  session_id: string;
  conversation_id: string | null;
  turn_id: string | null;
  trace_id: string | null;
  device_code: string | null;
  digital_human_id: string | null;
  source: "android" | "server" | "webview";
  category: string;
  event_name: string;
  timestamp_ms: number;
  elapsed_ms: number | null;
  payload_json: string | null;
  error_code: string | null;
  error_message: string | null;
  app_version: string | null;
  network_type: string | null;
  created_at: string;
};

let db: Database.Database | null = null;

export function getBehaviorEventDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "behavior_events.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists behavior_events (
      id text primary key,
      session_id text not null,
      conversation_id text,
      turn_id text,
      trace_id text,
      device_code text,
      digital_human_id text,
      source text not null,
      category text not null,
      event_name text not null,
      timestamp_ms integer not null,
      elapsed_ms integer,
      payload_json text,
      error_code text,
      error_message text,
      app_version text,
      network_type text,
      created_at text not null
    );
    create index if not exists idx_behavior_events_trace_id on behavior_events(trace_id);
    create index if not exists idx_behavior_events_device_code on behavior_events(device_code);
    create index if not exists idx_behavior_events_timestamp_ms on behavior_events(timestamp_ms);
  `);

  return db;
}

export function insertBehaviorEvents(events: BehaviorEventInput[]) {
  if (events.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const stmt = getBehaviorEventDb().prepare(`
    insert or replace into behavior_events (
      id, session_id, conversation_id, turn_id, trace_id, device_code, digital_human_id,
      source, category, event_name, timestamp_ms, elapsed_ms, payload_json, error_code,
      error_message, app_version, network_type, created_at
    ) values (
      @id, @session_id, @conversation_id, @turn_id, @trace_id, @device_code, @digital_human_id,
      @source, @category, @event_name, @timestamp_ms, @elapsed_ms, @payload_json, @error_code,
      @error_message, @app_version, @network_type, @created_at
    )
  `);

  const tx = getBehaviorEventDb().transaction((items: BehaviorEventInput[]) => {
    for (const item of items) {
      stmt.run(serializeBehaviorEvent(item, now));
    }
  });

  tx(events);
  return events.length;
}

export function listBehaviorEvents(limit = 100) {
  const rows = getBehaviorEventDb()
    .prepare("select * from behavior_events order by timestamp_ms desc limit ?")
    .all(limit) as BehaviorEventRow[];
  return rows.map(deserializeBehaviorEvent);
}

function serializeBehaviorEvent(event: BehaviorEventInput, createdAt: string) {
  return {
    id: event.id,
    session_id: event.sessionId,
    conversation_id: normalizeNullable(event.conversationId),
    turn_id: normalizeNullable(event.turnId),
    trace_id: normalizeNullable(event.traceId),
    device_code: normalizeNullable(event.deviceCode),
    digital_human_id: normalizeNullable(event.digitalHumanId),
    source: event.source,
    category: event.category,
    event_name: event.eventName,
    timestamp_ms: event.timestampMs,
    elapsed_ms: event.elapsedMs ?? null,
    payload_json: event.payload ? JSON.stringify(event.payload) : null,
    error_code: normalizeNullable(event.errorCode),
    error_message: normalizeNullable(event.errorMessage),
    app_version: normalizeNullable(event.appVersion),
    network_type: normalizeNullable(event.networkType),
    created_at: createdAt,
  };
}

function deserializeBehaviorEvent(row: BehaviorEventRow): BehaviorEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    conversationId: row.conversation_id,
    turnId: row.turn_id,
    traceId: row.trace_id,
    deviceCode: row.device_code,
    digitalHumanId: row.digital_human_id,
    source: row.source,
    category: row.category,
    eventName: row.event_name,
    timestampMs: row.timestamp_ms,
    elapsedMs: row.elapsed_ms,
    payload: row.payload_json ? safeParsePayload(row.payload_json) : null,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    appVersion: row.app_version,
    networkType: row.network_type,
    createdAt: row.created_at,
  };
}

function normalizeNullable(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeParsePayload(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { raw: value };
  }
}
