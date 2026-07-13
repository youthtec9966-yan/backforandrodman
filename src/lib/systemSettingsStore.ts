import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type SystemSettings = {
  alibabaCloudAccessKeyId: string;
  alibabaCloudAccessKeySecret: string;
  bailianWorkspaceId: string;
  bailianEndpoint: string;
  authJwtSecret: string;
  cookieSecure: boolean;
  appDashscopeApiKey: string;
  appLlmApiKey: string;
  appAsrApiKey: string;
  appTtsApiKey: string;
  appBaseUrl: string;
  updatedAt: string | null;
};

export type UpdateSystemSettingsInput = Partial<Omit<SystemSettings, "updatedAt">>;

type SystemSettingsRow = {
  singleton_id: number;
  alibaba_cloud_access_key_id: string;
  alibaba_cloud_access_key_secret: string;
  bailian_workspace_id: string;
  bailian_endpoint: string;
  auth_jwt_secret: string;
  cookie_secure: number;
  app_dashscope_api_key: string;
  app_llm_api_key: string;
  app_asr_api_key: string;
  app_tts_api_key: string;
  app_base_url: string;
  updated_at: string | null;
};

const DEFAULT_BAILIAN_ENDPOINT = "bailian.cn-beijing.aliyuncs.com";
const DEFAULT_AUTH_SECRET = "dev-only-change-me-auth-secret";

let db: Database.Database | null = null;

export function getSystemSettingsDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "system.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists system_settings (
      singleton_id integer primary key check (singleton_id = 1),
      alibaba_cloud_access_key_id text not null default '',
      alibaba_cloud_access_key_secret text not null default '',
      bailian_workspace_id text not null default '',
      bailian_endpoint text not null default '',
      auth_jwt_secret text not null default '',
      cookie_secure integer not null default 0,
      app_dashscope_api_key text not null default '',
      app_llm_api_key text not null default '',
      app_asr_api_key text not null default '',
      app_tts_api_key text not null default '',
      app_base_url text not null default '',
      updated_at text
    );
  `);
  ensureSystemSettingsColumns(db);
  ensureSystemSettingsRow(db);
  return db;
}

export function getSystemSettings(): SystemSettings {
  const row = getSystemSettingsDb()
    .prepare("select * from system_settings where singleton_id = 1")
    .get() as SystemSettingsRow;

  return {
    alibabaCloudAccessKeyId: firstNonBlank(
      row.alibaba_cloud_access_key_id,
      process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    ),
    alibabaCloudAccessKeySecret: firstNonBlank(
      row.alibaba_cloud_access_key_secret,
      process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    ),
    bailianWorkspaceId: firstNonBlank(
      row.bailian_workspace_id,
      process.env.BAILIAN_WORKSPACE_ID,
      process.env.WORKSPACE_ID,
    ),
    bailianEndpoint: firstNonBlank(
      row.bailian_endpoint,
      process.env.BAILIAN_ENDPOINT,
      DEFAULT_BAILIAN_ENDPOINT,
    ),
    authJwtSecret: firstNonBlank(
      row.auth_jwt_secret,
      process.env.AUTH_JWT_SECRET,
      process.env.NEXTAUTH_SECRET,
      DEFAULT_AUTH_SECRET,
    ),
    cookieSecure: row.cookie_secure === 1
      || process.env.COOKIE_SECURE === "true"
      || (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false"),
    appDashscopeApiKey: firstNonBlank(
      row.app_dashscope_api_key,
      process.env.APP_DASHSCOPE_API_KEY,
      process.env.DASHSCOPE_API_KEY,
    ),
    appLlmApiKey: firstNonBlank(
      row.app_llm_api_key,
      process.env.APP_LLM_API_KEY,
      process.env.LLM_API_KEY,
      row.app_dashscope_api_key,
      process.env.APP_DASHSCOPE_API_KEY,
      process.env.DASHSCOPE_API_KEY,
    ),
    appAsrApiKey: firstNonBlank(
      row.app_asr_api_key,
      process.env.APP_ASR_API_KEY,
      process.env.ASR_API_KEY,
      row.app_dashscope_api_key,
      process.env.APP_DASHSCOPE_API_KEY,
      process.env.DASHSCOPE_API_KEY,
    ),
    appTtsApiKey: firstNonBlank(
      row.app_tts_api_key,
      process.env.APP_TTS_API_KEY,
      process.env.TTS_API_KEY,
      row.app_dashscope_api_key,
      process.env.APP_DASHSCOPE_API_KEY,
      process.env.DASHSCOPE_API_KEY,
    ),
    appBaseUrl: firstNonBlank(
      row.app_base_url,
      process.env.APP_BASE_URL,
      process.env.BAILIAN_APP_BASE_URL,
      "https://dashscope.aliyuncs.com",
    ),
    updatedAt: row.updated_at,
  };
}

export function updateSystemSettings(input: UpdateSystemSettingsInput) {
  const current = getSystemSettings();
  const next: SystemSettings = {
    alibabaCloudAccessKeyId: readOptionalTrimmed(input.alibabaCloudAccessKeyId, current.alibabaCloudAccessKeyId),
    alibabaCloudAccessKeySecret: readOptionalTrimmed(input.alibabaCloudAccessKeySecret, current.alibabaCloudAccessKeySecret),
    bailianWorkspaceId: readOptionalTrimmed(input.bailianWorkspaceId, current.bailianWorkspaceId),
    bailianEndpoint: normalizeEndpoint(readOptionalTrimmed(input.bailianEndpoint, current.bailianEndpoint)),
    authJwtSecret: readOptionalTrimmed(input.authJwtSecret, current.authJwtSecret),
    cookieSecure: typeof input.cookieSecure === "boolean" ? input.cookieSecure : current.cookieSecure,
    appDashscopeApiKey: readOptionalTrimmed(input.appDashscopeApiKey, current.appDashscopeApiKey),
    appLlmApiKey: readOptionalTrimmed(input.appLlmApiKey, current.appLlmApiKey),
    appAsrApiKey: readOptionalTrimmed(input.appAsrApiKey, current.appAsrApiKey),
    appTtsApiKey: readOptionalTrimmed(input.appTtsApiKey, current.appTtsApiKey),
    appBaseUrl: normalizeBaseUrl(readOptionalTrimmed(input.appBaseUrl, current.appBaseUrl)),
    updatedAt: new Date().toISOString(),
  };

  getSystemSettingsDb()
    .prepare(`
      update system_settings set
        alibaba_cloud_access_key_id = @alibaba_cloud_access_key_id,
        alibaba_cloud_access_key_secret = @alibaba_cloud_access_key_secret,
        bailian_workspace_id = @bailian_workspace_id,
        bailian_endpoint = @bailian_endpoint,
        auth_jwt_secret = @auth_jwt_secret,
        cookie_secure = @cookie_secure,
        app_dashscope_api_key = @app_dashscope_api_key,
        app_llm_api_key = @app_llm_api_key,
        app_asr_api_key = @app_asr_api_key,
        app_tts_api_key = @app_tts_api_key,
        app_base_url = @app_base_url,
        updated_at = @updated_at
      where singleton_id = 1
    `)
    .run(serializeSystemSettings(next));

  return getSystemSettings();
}

function ensureSystemSettingsRow(database: Database.Database) {
  const row = database
    .prepare("select singleton_id from system_settings where singleton_id = 1")
    .get() as { singleton_id: number } | undefined;

  if (row) {
    return;
  }

  database
    .prepare(`
      insert into system_settings (
        singleton_id,
        alibaba_cloud_access_key_id,
        alibaba_cloud_access_key_secret,
        bailian_workspace_id,
        bailian_endpoint,
        auth_jwt_secret,
        cookie_secure,
        app_dashscope_api_key,
        app_llm_api_key,
        app_asr_api_key,
        app_tts_api_key,
        app_base_url,
        updated_at
      ) values (
        1, '', '', '', '', '', 0, '', '', '', '', '', null
      )
    `)
    .run();
}

function ensureSystemSettingsColumns(database: Database.Database) {
  const rows = database.prepare("pragma table_info(system_settings)").all() as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  const columns = [
    ["app_llm_api_key", "text not null default ''"],
    ["app_asr_api_key", "text not null default ''"],
    ["app_tts_api_key", "text not null default ''"],
  ] as const;
  for (const [name, definition] of columns) {
    if (!existing.has(name)) {
      database.exec(`alter table system_settings add column ${name} ${definition}`);
    }
  }
}

function serializeSystemSettings(settings: SystemSettings) {
  return {
    singleton_id: 1,
    alibaba_cloud_access_key_id: settings.alibabaCloudAccessKeyId,
    alibaba_cloud_access_key_secret: settings.alibabaCloudAccessKeySecret,
    bailian_workspace_id: settings.bailianWorkspaceId,
    bailian_endpoint: settings.bailianEndpoint,
    auth_jwt_secret: settings.authJwtSecret,
    cookie_secure: settings.cookieSecure ? 1 : 0,
    app_dashscope_api_key: settings.appDashscopeApiKey,
    app_llm_api_key: settings.appLlmApiKey,
    app_asr_api_key: settings.appAsrApiKey,
    app_tts_api_key: settings.appTtsApiKey,
    app_base_url: settings.appBaseUrl,
    updated_at: settings.updatedAt,
  };
}

function readOptionalTrimmed(value: string | undefined, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

function firstNonBlank(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeEndpoint(value: string) {
  return value.trim() || DEFAULT_BAILIAN_ENDPOINT;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "https://dashscope.aliyuncs.com";
  }
  return trimmed.replace(/\/+$/, "");
}
