import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";

export type UserRole = "super_admin" | "admin" | "operator";
export type UserStatus = "enabled" | "disabled";

export type UserRecord = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  deviceQuota: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  allowedLive2dModelIds: string[];
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  password_hash: string;
  password_salt: string;
  device_quota: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  allowed_live2d_model_ids_json: string;
};

type CreateUserInput = {
  username: string;
  password: string;
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  deviceQuota?: number;
};

type UpdateUserInput = {
  password?: string;
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  deviceQuota?: number;
  allowedLive2dModelIds?: string[];
};

let db: Database.Database | null = null;

export function getUserDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "auth.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists users (
      id text primary key,
      username text not null unique,
      display_name text not null default '',
      role text not null default 'operator',
      status text not null default 'enabled',
      password_hash text not null,
      password_salt text not null,
      device_quota integer not null default 0,
      last_login_at text,
      created_at text not null,
      updated_at text not null,
      allowed_live2d_model_ids_json text not null default '[]'
    );
  `);

  ensureUserTableColumns(db);
  ensureSuperAdminAccount(db);
  return db;
}

export function listUsers() {
  const rows = getUserDb()
    .prepare("select * from users order by datetime(created_at) asc")
    .all() as UserRow[];
  return rows.map(deserializeUser);
}

export function getUser(id: string) {
  const row = getUserDb().prepare("select * from users where id = ?").get(id) as UserRow | undefined;
  return row ? deserializeUser(row) : null;
}

export function createUser(input: CreateUserInput) {
  const username = normalizeUsername(input.username);
  const password = input.password.trim();
  if (!username) throw new Error("用户名不能为空");
  if (password.length < 6) throw new Error("密码至少 6 位");

  const now = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const record: any = {
    id: randomUUID(),
    username,
    displayName: input.displayName?.trim() || username,
    role: normalizeRole(input.role),
    status: normalizeStatus(input.status),
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    deviceQuota: normalizeDeviceQuota(input.deviceQuota, normalizeRole(input.role)),
    lastLoginAt: null as string | null,
    createdAt: now,
    updatedAt: now,
    allowedLive2dModelIds: [],
  };

  getUserDb()
    .prepare(`
      insert into users (
        id, username, display_name, role, status, password_hash, password_salt,
        device_quota, last_login_at, created_at, updated_at, allowed_live2d_model_ids_json
      ) values (
        @id, @username, @display_name, @role, @status, @password_hash, @password_salt,
        @device_quota, @last_login_at, @created_at, @updated_at, @allowed_live2d_model_ids_json
      )
    `)
    .run(serializeUserWithPassword(record));

  return getUser(record.id) as UserRecord;
}

export function updateUser(id: string, patch: UpdateUserInput) {
  const row = getUserDb().prepare("select * from users where id = ?").get(id) as UserRow | undefined;
  if (!row) return null;

  const currentRole = normalizeRole(row.role as UserRole);
  const nextRole = normalizeRole(patch.role ?? currentRole);
  const status = patch.status ? normalizeStatus(patch.status) : normalizeStatus(row.status as UserStatus);
  if (currentRole === "super_admin" && row.status === "enabled") {
    const losingSuperAdmin = nextRole !== "super_admin" || status === "disabled";
    if (losingSuperAdmin && enabledSuperAdminCount() <= 1) {
      throw new Error("至少保留一个启用的超级管理员账号");
    }
  }

  const current = deserializeUser(row);
  const password = patch.password?.trim();
  const salt = password ? randomBytes(16).toString("hex") : row.password_salt;
  const next: any = {
    id: row.id,
    username: row.username,
    displayName: patch.displayName?.trim() || row.display_name || row.username,
    role: nextRole,
    status,
    passwordHash: password ? hashPassword(password, salt) : row.password_hash,
    passwordSalt: salt,
    deviceQuota: normalizeDeviceQuota(patch.deviceQuota ?? row.device_quota, nextRole),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: new Date().toISOString(),
    allowedLive2dModelIds: Array.isArray(patch.allowedLive2dModelIds)
      ? patch.allowedLive2dModelIds
      : current.allowedLive2dModelIds,
  };

  getUserDb()
    .prepare(`
      update users set
        display_name = @display_name,
        role = @role,
        status = @status,
        password_hash = @password_hash,
        password_salt = @password_salt,
        device_quota = @device_quota,
        updated_at = @updated_at,
        allowed_live2d_model_ids_json = @allowed_live2d_model_ids_json
      where id = @id
    `)
    .run(serializeUserWithPassword(next));

  return getUser(id);
}

export function deleteUser(id: string) {
  const row = getUserDb().prepare("select * from users where id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  if (normalizeRole(row.role as UserRole) === "super_admin" && row.status === "enabled" && enabledSuperAdminCount() <= 1) {
    throw new Error("至少保留一个启用的超级管理员账号");
  }
  getUserDb().prepare("delete from users where id = ?").run(id);
  return deserializeUser(row);
}

export function removeAllowedLive2dModelIdFromAllUsers(modelId: string) {
  const normalized = typeof modelId === "string" ? modelId.trim() : "";
  if (!normalized) {
    return;
  }
  const users = listUsers();
  for (const user of users) {
    if (!Array.isArray(user.allowedLive2dModelIds) || !user.allowedLive2dModelIds.includes(normalized)) {
      continue;
    }
    updateUser(user.id, {
      allowedLive2dModelIds: user.allowedLive2dModelIds.filter((item) => item !== normalized),
    });
  }
}

export function authenticateUser(usernameInput: string, passwordInput: string) {
  const username = normalizeUsername(usernameInput);
  const row = getUserDb().prepare("select * from users where username = ?").get(username) as UserRow | undefined;
  if (!row || row.status !== "enabled" || !verifyPassword(passwordInput, row.password_salt, row.password_hash)) {
    return null;
  }

  const now = new Date().toISOString();
  getUserDb().prepare("update users set last_login_at = ?, updated_at = ? where id = ?").run(now, now, row.id);
  return getUser(row.id);
}

function ensureUserTableColumns(database: Database.Database) {
  const columns = database.prepare("pragma table_info(users)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((item) => item.name));
  if (!columnNames.has("device_quota")) {
    database.exec("alter table users add column device_quota integer not null default 0");
  }
  if (!columnNames.has("allowed_live2d_model_ids_json")) {
    database.exec("alter table users add column allowed_live2d_model_ids_json text not null default '[]'");
  }
}

function ensureSuperAdminAccount(database: Database.Database) {
  const superAdminCount = database
    .prepare("select count(1) as count from users where role = 'super_admin'")
    .get() as { count: number };
  if (superAdminCount.count > 0) {
    return;
  }

  const firstAdmin = database.prepare(`
    select * from users
    where role = 'admin'
    order by datetime(created_at) asc
    limit 1
  `).get() as UserRow | undefined;
  if (firstAdmin) {
    database.prepare(`
      update users
      set role = 'super_admin',
          device_quota = -1,
          updated_at = ?
      where id = ?
    `).run(new Date().toISOString(), firstAdmin.id);
    return;
  }

  createUser({
    username: process.env.SUPER_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "admin",
    password: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123456",
    displayName: process.env.SUPER_ADMIN_DISPLAY_NAME || process.env.ADMIN_DISPLAY_NAME || "超级管理员",
    role: "super_admin",
    deviceQuota: -1,
  });
}

function enabledSuperAdminCount() {
  const row = getUserDb()
    .prepare("select count(1) as count from users where role = 'super_admin' and status = 'enabled'")
    .get() as { count: number };
  return row.count;
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(value: UserRole | undefined): UserRole {
  if (value === "super_admin") return "super_admin";
  if (value === "admin") return "admin";
  return "operator";
}

function normalizeStatus(value: UserStatus | undefined): UserStatus {
  return value === "disabled" ? "disabled" : "enabled";
}

function normalizeDeviceQuota(value: number | undefined, role: UserRole) {
  if (role === "super_admin") {
    return -1;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function serializeUserWithPassword(record: UserRecord & { passwordHash: string; passwordSalt: string }) {
  return {
    id: record.id,
    username: record.username,
    display_name: record.displayName,
    role: record.role,
    status: record.status,
    password_hash: record.passwordHash,
    password_salt: record.passwordSalt,
    device_quota: record.deviceQuota,
    last_login_at: record.lastLoginAt,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    allowed_live2d_model_ids_json: JSON.stringify(
      Array.isArray((record as any).allowedLive2dModelIds) ? (record as any).allowedLive2dModelIds : []
    ),
  };
}

function deserializeUser(row: UserRow): UserRecord {
  let allowedLive2dModelIds: string[] = [];
  try {
    const parsed = JSON.parse(row.allowed_live2d_model_ids_json || "[]");
    if (Array.isArray(parsed)) {
      allowedLive2dModelIds = parsed.filter((id) => typeof id === "string");
    }
  } catch {
    // ignore
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: normalizeRole(row.role as UserRole),
    status: normalizeStatus(row.status as UserStatus),
    deviceQuota: typeof row.device_quota === "number" ? row.device_quota : 0,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allowedLive2dModelIds,
  };
}
