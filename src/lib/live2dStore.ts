import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  getLive2dRootPath,
  invalidateLive2dModelDisplayNameCache,
  listLive2dModels,
  type Live2dModelOption,
} from "./live2dAssets";

export type Live2dModelRecord = {
  id: string;
  folderName: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

type Live2dModelRow = {
  id: string;
  folder_name: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type ImportedLive2dFile = {
  relativePath: string;
  buffer: Buffer;
};

let db: Database.Database | null = null;

export function getLive2dDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "live2d.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists live2d_models (
      id text primary key,
      folder_name text not null unique,
      display_name text not null,
      created_at text not null,
      updated_at text not null
    );
  `);
  ensureLive2dTableColumns(db);
  syncExistingLive2dModels(db);
  return db;
}

function ensureLive2dTableColumns(database: Database.Database) {
  // 确保表列存在
  const columns = database.prepare("pragma table_info(live2d_models)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((item) => item.name));

  if (!columnNames.has("folder_name")) {
    database.exec("alter table live2d_models add column folder_name text not null default ''");
  }
  if (!columnNames.has("display_name")) {
    database.exec("alter table live2d_models add column display_name text not null default ''");
  }
}

function syncExistingLive2dModels(database: Database.Database) {
  const existing = listLive2dModels();
  const now = new Date().toISOString();

  for (const model of existing) {
    const row = database
      .prepare("select * from live2d_models where folder_name = ?")
      .get(model.folderName) as Live2dModelRow | undefined;
    if (!row) {
      database
        .prepare(`
          insert into live2d_models (
            id, folder_name, display_name, created_at, updated_at
          ) values (
            @id, @folderName, @displayName, @createdAt, @updatedAt
          )
        `)
        .run({
          id: randomUUID(),
          folderName: model.folderName,
          displayName: model.name,
          createdAt: now,
          updatedAt: now,
        });
    }
  }
}

export function listAllLive2dModels(): Array<Live2dModelRecord & { modelPath?: string; previewUrl?: string }> {
  const rows = getLive2dDb()
    .prepare("select * from live2d_models order by datetime(updated_at) desc")
    .all() as Live2dModelRow[];

  const existingFromFs = new Map(listLive2dModels().map((m) => [m.folderName, m]));

  return rows.map((row) => {
    const fromFs = existingFromFs.get(row.folder_name);
    return {
      id: row.id,
      folderName: row.folder_name,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      modelPath: fromFs?.modelPath,
      previewUrl: fromFs?.previewUrl,
    };
  });
}

export function getLive2dModel(id: string) {
  const row = getLive2dDb()
    .prepare("select * from live2d_models where id = ?")
    .get(id) as Live2dModelRow | undefined;
  if (!row) return null;

  const existingFromFs = new Map(listLive2dModels().map((m) => [m.folderName, m]));
  const fromFs = existingFromFs.get(row.folder_name);

  return {
    id: row.id,
    folderName: row.folder_name,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modelPath: fromFs?.modelPath,
    previewUrl: fromFs?.previewUrl,
  };
}

export function updateLive2dModel(id: string, patch: { displayName?: string }) {
  const row = getLive2dDb()
    .prepare("select * from live2d_models where id = ?")
    .get(id) as Live2dModelRow | undefined;
  if (!row) throw new Error("模型不存在");

  const now = new Date().toISOString();
  getLive2dDb()
    .prepare(`
      update live2d_models set
        display_name = coalesce(@displayName, display_name),
        updated_at = @updatedAt
      where id = @id
    `)
    .run({
      id,
      displayName: patch.displayName?.trim(),
      updatedAt: now,
    });
  invalidateLive2dModelDisplayNameCache();
  return getLive2dModel(id);
}

export function deleteLive2dModel(id: string) {
  const row = getLive2dDb()
    .prepare("select * from live2d_models where id = ?")
    .get(id) as Live2dModelRow | undefined;
  if (!row) throw new Error("模型不存在");

  const folderPath = path.join(getLive2dRootPath(), row.folder_name);
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
  getLive2dDb().prepare("delete from live2d_models where id = ?").run(id);
  require("./userStore").removeAllowedLive2dModelIdFromAllUsers(row.id);
  invalidateLive2dModelDisplayNameCache();
  return {
    id: row.id,
    folderName: row.folder_name,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function registerLive2dModel(folderName: string, displayName: string) {
  const now = new Date().toISOString();
  const existing = getLive2dDb()
    .prepare("select * from live2d_models where folder_name = ?")
    .get(folderName) as Live2dModelRow | undefined;
  if (existing) {
    return getLive2dModel(existing.id);
  }

  const id = randomUUID();
  getLive2dDb()
    .prepare(`
      insert into live2d_models (
        id, folder_name, display_name, created_at, updated_at
      ) values (
        @id, @folderName, @displayName, @createdAt, @updatedAt
      )
    `)
    .run({
      id,
      folderName,
      displayName: displayName.trim() || folderName,
      createdAt: now,
      updatedAt: now,
    });

  invalidateLive2dModelDisplayNameCache();
  return getLive2dModel(id);
}

export function importLive2dModel(input: {
  folderName?: string;
  displayName?: string;
  files: ImportedLive2dFile[];
}) {
  const sourceFiles = Array.isArray(input.files) ? input.files : [];
  if (!sourceFiles.length) {
    throw new Error("请先选择模型目录文件");
  }

  const inferredFolderName = inferFolderNameFromFiles(sourceFiles);
  const folderName = normalizeFolderName(input.folderName || inferredFolderName);
  if (!folderName) {
    throw new Error("模型目录名称无效");
  }

  const targetRoot = getLive2dRootPath();
  fs.mkdirSync(targetRoot, { recursive: true });
  const targetFolder = path.join(targetRoot, folderName);
  if (fs.existsSync(targetFolder)) {
    throw new Error("同名模型目录已存在");
  }

  const normalizedFiles = sourceFiles.map((file) => ({
    relativePath: normalizeImportedRelativePath(file.relativePath),
    buffer: file.buffer,
  }));
  const modelConfigFiles = normalizedFiles.filter((file) => /^[^/]+\.model3\.json$/i.test(file.relativePath));
  if (modelConfigFiles.length !== 1) {
    throw new Error("模型目录根目录下必须且只能有一个 .model3.json 文件");
  }

  try {
    for (const file of normalizedFiles) {
      const targetPath = path.join(targetFolder, file.relativePath);
      const normalizedTargetPath = path.normalize(targetPath);
      if (!normalizedTargetPath.startsWith(targetFolder)) {
        throw new Error("模型文件路径非法");
      }
      fs.mkdirSync(path.dirname(normalizedTargetPath), { recursive: true });
      fs.writeFileSync(normalizedTargetPath, file.buffer);
    }
    const displayName = input.displayName?.trim() || folderName;
    return registerLive2dModel(folderName, displayName);
  } catch (error) {
    fs.rmSync(targetFolder, { recursive: true, force: true });
    throw error;
  }
}

export function getModelsAllowedForUser(userId: string) {
  const user = require("./userStore").getUser(userId) as any;
  if (!user) return [];

  if (user.role === "super_admin") {
    return listAllLive2dModels();
  }

  const allowedIds = Array.isArray(user.allowedLive2dModelIds) ? user.allowedLive2dModelIds : [];
  if (!allowedIds.length) {
    return [];
  }

  const all = listAllLive2dModels();
  const allowedSet = new Set(allowedIds);
  return all.filter((m) => allowedSet.has(m.id));
}

function inferFolderNameFromFiles(files: ImportedLive2dFile[]) {
  for (const file of files) {
    const rawPath = typeof file.relativePath === "string" ? file.relativePath.replace(/\\/g, "/") : "";
    const [folderName] = rawPath.split("/").filter(Boolean);
    if (folderName) {
      return folderName;
    }
  }
  return "";
}

function normalizeFolderName(value: string) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.includes("/") || normalized === "." || normalized === "..") {
    return "";
  }
  return normalized.replace(/\s+/g, "-");
}

function normalizeImportedRelativePath(input: string) {
  const normalized = input.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) {
    throw new Error("模型文件路径不能为空");
  }
  const stripped = segments.length > 1 ? segments.slice(1) : segments;
  if (!stripped.length || stripped.some((segment) => segment === "." || segment === "..")) {
    throw new Error("模型文件路径非法");
  }
  return stripped.join("/");
}
