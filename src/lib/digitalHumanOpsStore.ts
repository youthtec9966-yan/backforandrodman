import { randomUUID } from "crypto";
import { getDigitalHumanDb, getDigitalHuman, getCurrentConfigVersion } from "@/lib/digitalHumanStore";
import type {
  ActivationCodeCreatePayload,
  ActivationCodeVerifyPayload,
  AppActivationRequestPayload,
  DeviceDeletePayload,
  DevicePayload,
  HotwordPayload,
  InteractionPayload,
  PendingActivationApprovePayload,
  PublishCreatePayload,
  QaPayload,
} from "@/lib/digitalHumanOpsValidation";

export type InteractionSettings = InteractionPayload;
export type QaEntry = {
  id: string;
  question: string;
  answer: string;
  status: "enabled" | "pending" | "disabled";
};
export type QaCollection = { items: QaEntry[] };
export type HotwordGroup = {
  id: string;
  name: string;
  words: string[];
  type: "business" | "campaign" | "sensitive";
  enabled: boolean;
};
export type HotwordCollection = { groups: HotwordGroup[] };
export type PublishRecord = {
  id: string;
  digitalHumanId: string;
  configVersionId: string | null;
  publishVersion: string;
  publishScope: "all" | "partial";
  summary: string;
  remark: string;
  status: "pending" | "completed";
  createdAt: string;
};
export type DeviceBinding = {
  id: string;
  deviceCode: string;
  deviceName: string;
  bindStatus: "active" | "inactive";
  appVersion: string;
  lastSyncAt: string;
  approvedByUserId?: string | null;
  approvedByUsername?: string;
};
export type DeviceCollection = { devices: DeviceBinding[] };
export type ActivationCodeRecord = {
  id: string;
  digitalHumanId: string;
  deviceCode: string;
  deviceName: string;
  activationCode: string;
  activationCodeMasked: string;
  status: "published" | "activated";
  remark: string;
  publishedAt: string;
  activatedAt: string | null;
  appVersion: string;
};
export type PendingActivationRequest = {
  id: string;
  deviceCode: string;
  deviceName: string;
  appVersion: string;
  activationCode: string;
  activationCodeMasked: string;
  status: "pending" | "approved";
  digitalHumanId: string | null;
  requestedAt: string;
  approvedAt: string | null;
  requestCount: number;
};

type JsonRow = { payload_json: string };
type PublishRow = {
  id: string;
  digital_human_id: string;
  config_version_id: string | null;
  publish_version: string;
  publish_scope: "all" | "partial";
  summary: string;
  remark: string;
  status: "pending" | "completed";
  created_at: string;
};
type DeviceRow = {
  id: string;
  digital_human_id: string;
  device_code: string;
  device_name: string;
  bind_status: "active" | "inactive";
  app_version: string;
  last_sync_at: string;
  approved_by_user_id: string | null;
  approved_by_username: string;
};
type ActivationCodeRow = {
  id: string;
  digital_human_id: string;
  device_code: string;
  device_name: string;
  activation_code: string;
  activation_code_masked: string;
  status: "published" | "activated";
  remark: string;
  published_at: string;
  activated_at: string | null;
  app_version: string;
};
type PendingActivationRow = {
  id: string;
  device_code: string;
  device_name: string;
  app_version: string;
  activation_code: string;
  activation_code_masked: string;
  status: "pending" | "approved";
  digital_human_id: string | null;
  requested_at: string;
  approved_at: string | null;
  request_count: number;
  updated_at: string;
};

let opsTablesInitialized = false;

export function initOpsTables() {
  if (opsTablesInitialized) {
    return;
  }
  const db = getDigitalHumanDb();
  db.exec(`
    create table if not exists digital_human_interactions (
      digital_human_id text primary key,
      payload_json text not null,
      updated_at text not null
    );
    create table if not exists digital_human_fixed_qa (
      digital_human_id text primary key,
      payload_json text not null,
      updated_at text not null
    );
    create table if not exists digital_human_faq (
      digital_human_id text primary key,
      payload_json text not null,
      updated_at text not null
    );
    create table if not exists digital_human_hotwords (
      digital_human_id text primary key,
      payload_json text not null,
      updated_at text not null
    );
    create table if not exists digital_human_publish_records (
      id text primary key,
      digital_human_id text not null,
      config_version_id text,
      publish_version text not null,
      publish_scope text not null,
      summary text not null,
      remark text not null default '',
      status text not null default 'completed',
      created_at text not null
    );
    create table if not exists digital_human_devices (
      id text primary key,
      digital_human_id text not null,
      device_code text not null,
      device_name text not null,
      bind_status text not null default 'active',
      app_version text not null default '',
      last_sync_at text not null,
      approved_by_user_id text,
      approved_by_username text not null default '',
      updated_at text not null
    );
    create table if not exists digital_human_activation_codes (
      id text primary key,
      digital_human_id text not null,
      device_code text not null,
      device_name text not null default '',
      activation_code text not null unique,
      activation_code_masked text not null default '',
      status text not null default 'published',
      remark text not null default '',
      published_at text not null,
      activated_at text,
      app_version text not null default ''
    );
    create index if not exists idx_digital_human_activation_codes_human
      on digital_human_activation_codes(digital_human_id, published_at desc);
    create index if not exists idx_digital_human_activation_codes_device
      on digital_human_activation_codes(digital_human_id, device_code);
    create table if not exists pending_activation_requests (
      id text primary key,
      device_code text not null unique,
      device_name text not null default '',
      app_version text not null default '',
      activation_code text not null,
      activation_code_masked text not null default '',
      status text not null default 'pending',
      digital_human_id text,
      requested_at text not null,
      approved_at text,
      request_count integer not null default 1,
      updated_at text not null
    );
    create index if not exists idx_pending_activation_requests_status
      on pending_activation_requests(status, requested_at desc);
  `);

  ensureOpsTableColumns(db);
  const humans = db.prepare("select id from digital_humans").all() as Array<{ id: string }>;
  humans.forEach(({ id }) => seedOpsForHuman(id));
  opsTablesInitialized = true;
}

export function getInteractionSettings(digitalHumanId: string): InteractionSettings {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  return readJsonRow("digital_human_interactions", digitalHumanId, defaultInteractionSettings());
}

export function saveInteractionSettings(digitalHumanId: string, payload: InteractionPayload): InteractionSettings {
  ensureDigitalHuman(digitalHumanId);
  upsertJsonRow("digital_human_interactions", digitalHumanId, payload);
  return getInteractionSettings(digitalHumanId);
}

export function getFixedQa(digitalHumanId: string): QaCollection {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  return readJsonRow("digital_human_fixed_qa", digitalHumanId, defaultFixedQa());
}

export function saveFixedQa(digitalHumanId: string, payload: QaPayload): QaCollection {
  ensureDigitalHuman(digitalHumanId);
  const items = payload.items.map((item) => ({ ...item, id: item.id?.trim() || randomUUID() }));
  upsertJsonRow("digital_human_fixed_qa", digitalHumanId, { items });
  return getFixedQa(digitalHumanId);
}

export function getFaq(digitalHumanId: string): QaCollection {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  return readJsonRow("digital_human_faq", digitalHumanId, defaultFaq());
}

export function saveFaq(digitalHumanId: string, payload: QaPayload): QaCollection {
  ensureDigitalHuman(digitalHumanId);
  const items = payload.items.map((item) => ({ ...item, id: item.id?.trim() || randomUUID() }));
  upsertJsonRow("digital_human_faq", digitalHumanId, { items });
  return getFaq(digitalHumanId);
}

export function getHotwords(digitalHumanId: string): HotwordCollection {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  return readJsonRow("digital_human_hotwords", digitalHumanId, defaultHotwords());
}

export function saveHotwords(digitalHumanId: string, payload: HotwordPayload): HotwordCollection {
  ensureDigitalHuman(digitalHumanId);
  const groups = payload.groups.map((group) => ({ ...group, id: group.id?.trim() || randomUUID() }));
  upsertJsonRow("digital_human_hotwords", digitalHumanId, { groups });
  return getHotwords(digitalHumanId);
}

export function listPublishes(digitalHumanId: string): PublishRecord[] {
  ensureDigitalHuman(digitalHumanId);
  const rows = getDigitalHumanDb()
    .prepare(`
      select * from digital_human_publish_records
      where digital_human_id = ?
      order by datetime(created_at) desc
    `)
    .all(digitalHumanId) as PublishRow[];
  return rows.map((row) => ({
    id: row.id,
    digitalHumanId: row.digital_human_id,
    configVersionId: row.config_version_id,
    publishVersion: row.publish_version,
    publishScope: row.publish_scope,
    summary: row.summary,
    remark: row.remark,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function createPublish(digitalHumanId: string, payload: PublishCreatePayload): PublishRecord {
  ensureDigitalHuman(digitalHumanId);
  const currentVersion = getCurrentConfigVersion(digitalHumanId);
  const versionCount = listPublishes(digitalHumanId).length + 1;
  const record: PublishRecord = {
    id: randomUUID(),
    digitalHumanId,
    configVersionId: currentVersion?.id ?? null,
    publishVersion: `v1.0.${versionCount}`,
    publishScope: payload.publishScope,
    summary: payload.summary,
    remark: payload.remark,
    status: "completed",
    createdAt: new Date().toISOString(),
  };

  getDigitalHumanDb()
    .prepare(`
      insert into digital_human_publish_records (
        id, digital_human_id, config_version_id, publish_version,
        publish_scope, summary, remark, status, created_at
      ) values (
        @id, @digital_human_id, @config_version_id, @publish_version,
        @publish_scope, @summary, @remark, @status, @created_at
      )
    `)
    .run({
      id: record.id,
      digital_human_id: record.digitalHumanId,
      config_version_id: record.configVersionId,
      publish_version: record.publishVersion,
      publish_scope: record.publishScope,
      summary: record.summary,
      remark: record.remark,
      status: record.status,
      created_at: record.createdAt,
    });

  return record;
}

export function getDevices(digitalHumanId: string): DeviceCollection {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  const rows = getDigitalHumanDb()
    .prepare(`
      select * from digital_human_devices
      where digital_human_id = ?
      order by datetime(updated_at) desc, device_name asc
    `)
    .all(digitalHumanId) as DeviceRow[];
  return {
    devices: rows.map((row) => ({
      id: row.id,
      deviceCode: row.device_code,
      deviceName: row.device_name,
      bindStatus: row.bind_status,
      appVersion: row.app_version,
      lastSyncAt: row.last_sync_at,
      approvedByUserId: row.approved_by_user_id,
      approvedByUsername: row.approved_by_username,
    })),
  };
}

export function countActiveDevicesApprovedByUser(userId: string) {
  initOpsTables();
  const row = getDigitalHumanDb()
    .prepare(`
      select count(1) as count
      from digital_human_devices
      where approved_by_user_id = ?
        and bind_status = 'active'
    `)
    .get(userId) as { count: number };
  return row.count;
}

export function listActivationCodes(digitalHumanId: string): ActivationCodeRecord[] {
  ensureDigitalHuman(digitalHumanId);
  seedOpsForHuman(digitalHumanId);
  const rows = getDigitalHumanDb()
    .prepare(`
      select * from digital_human_activation_codes
      where digital_human_id = ?
      order by datetime(published_at) desc
    `)
    .all(digitalHumanId) as ActivationCodeRow[];
  return rows.map(mapActivationCodeRow);
}

export function createActivationCode(digitalHumanId: string, payload: ActivationCodeCreatePayload): ActivationCodeRecord {
  ensureDigitalHuman(digitalHumanId);
  const db = getDigitalHumanDb();
  const deviceCode = payload.deviceCode.trim();
  const deviceName = payload.deviceName.trim();
  const remark = payload.remark.trim();
  const existingRows = db.prepare(`
    select * from digital_human_activation_codes
    where digital_human_id = ? and device_code = ?
    order by datetime(published_at) desc
  `).all(digitalHumanId, deviceCode) as ActivationCodeRow[];

  if (existingRows.length > 0) {
    const [latest, ...duplicates] = existingRows;
    if (duplicates.length > 0) {
      const deleteStmt = db.prepare("delete from digital_human_activation_codes where id = ?");
      duplicates.forEach((row) => deleteStmt.run(row.id));
    }

    db.prepare(`
      update digital_human_activation_codes
      set device_name = ?,
          remark = ?,
          activation_code_masked = ?
      where id = ?
    `).run(
      deviceName || latest.device_name,
      remark || latest.remark,
      maskActivationCode(latest.activation_code),
      latest.id,
    );

    const current = db.prepare(`
      select * from digital_human_activation_codes
      where id = ?
      limit 1
    `).get(latest.id) as ActivationCodeRow;
    return mapActivationCodeRow(current);
  }

  const now = new Date().toISOString();
  const activationCode = generateActivationCodeValue();
  const row: ActivationCodeRow = {
    id: randomUUID(),
    digital_human_id: digitalHumanId,
    device_code: deviceCode,
    device_name: deviceName,
    activation_code: activationCode,
    activation_code_masked: maskActivationCode(activationCode),
    status: "published",
    remark,
    published_at: now,
    activated_at: null,
    app_version: "",
  };
  db.prepare(`
    insert into digital_human_activation_codes (
      id, digital_human_id, device_code, device_name, activation_code,
      activation_code_masked, status, remark, published_at, activated_at, app_version
    ) values (
      @id, @digital_human_id, @device_code, @device_name, @activation_code,
      @activation_code_masked, @status, @remark, @published_at, @activated_at, @app_version
    )
  `).run(row);
  return mapActivationCodeRow(row);
}

export function verifyActivationCode(payload: ActivationCodeVerifyPayload) {
  initOpsTables();
  const db = getDigitalHumanDb();
  const row = db.prepare(`
    select * from digital_human_activation_codes
    where activation_code = ?
    order by datetime(published_at) desc
    limit 1
  `).get(payload.activationCode.trim()) as ActivationCodeRow | undefined;

  if (!row) {
    throw new Error("激活码不存在");
  }
  if (row.status === "activated") {
    throw new Error("激活码已被使用");
  }
  if (row.device_code !== payload.deviceCode.trim()) {
    throw new Error("设备编码与激活码不匹配");
  }

  const now = new Date().toISOString();
  db.prepare(`
    update digital_human_activation_codes
    set status = 'activated',
        activated_at = ?,
        app_version = ?,
        device_name = case when trim(device_name) = '' then ? else device_name end
    where id = ?
  `).run(now, payload.appVersion.trim(), payload.deviceName.trim(), row.id);

  upsertActivatedDevice(row.digital_human_id, {
    deviceCode: payload.deviceCode.trim(),
    deviceName: payload.deviceName.trim() || row.device_name || payload.deviceCode.trim(),
    appVersion: payload.appVersion.trim(),
  });

  const updated = db.prepare("select * from digital_human_activation_codes where id = ?").get(row.id) as ActivationCodeRow;
  return {
    success: true,
    digitalHumanId: row.digital_human_id,
    activation: mapActivationCodeRow(updated),
    device: getDevices(row.digital_human_id).devices.find((item) => item.deviceCode === payload.deviceCode.trim()) ?? null,
  };
}

export function listPendingActivationRequests(): PendingActivationRequest[] {
  initOpsTables();
  const rows = getDigitalHumanDb()
    .prepare(`
      select * from pending_activation_requests
      order by
        case when status = 'pending' then 0 else 1 end asc,
        datetime(requested_at) desc
    `)
    .all() as PendingActivationRow[];
  return rows.map(mapPendingActivationRow);
}

export function registerPendingActivationRequest(payload: AppActivationRequestPayload): PendingActivationRequest {
  initOpsTables();
  const db = getDigitalHumanDb();
  const deviceCode = payload.deviceCode.trim();
  const deviceName = payload.deviceName.trim();
  const appVersion = payload.appVersion.trim();
  const now = new Date().toISOString();
  const existing = db.prepare(`
    select * from pending_activation_requests
    where device_code = ?
    limit 1
  `).get(deviceCode) as PendingActivationRow | undefined;

  if (existing) {
    db.prepare(`
      update pending_activation_requests
      set device_name = ?,
          app_version = ?,
          requested_at = ?,
          request_count = request_count + 1,
          updated_at = ?
      where id = ?
    `).run(
      deviceName || existing.device_name,
      appVersion || existing.app_version,
      now,
      now,
      existing.id,
    );
    return mapPendingActivationRow(db.prepare(`
      select * from pending_activation_requests where id = ?
    `).get(existing.id) as PendingActivationRow);
  }

  const activationCode = generateActivationCodeValue();
  const row: PendingActivationRow = {
    id: randomUUID(),
    device_code: deviceCode,
    device_name: deviceName,
    app_version: appVersion,
    activation_code: activationCode,
    activation_code_masked: maskActivationCode(activationCode),
    status: "pending",
    digital_human_id: null,
    requested_at: now,
    approved_at: null,
    request_count: 1,
    updated_at: now,
  };
  db.prepare(`
    insert into pending_activation_requests (
      id, device_code, device_name, app_version, activation_code, activation_code_masked,
      status, digital_human_id, requested_at, approved_at, request_count, updated_at
    ) values (
      @id, @device_code, @device_name, @app_version, @activation_code, @activation_code_masked,
      @status, @digital_human_id, @requested_at, @approved_at, @request_count, @updated_at
    )
  `).run(row);
  return mapPendingActivationRow(row);
}

export function findPendingActivationRequestByDeviceCode(deviceCode: string): PendingActivationRequest | null {
  initOpsTables();
  const normalizedDeviceCode = deviceCode.trim();
  if (!normalizedDeviceCode) {
    return null;
  }
  const row = getDigitalHumanDb()
    .prepare(`
      select * from pending_activation_requests
      where device_code = ?
      limit 1
    `)
    .get(normalizedDeviceCode) as PendingActivationRow | undefined;
  return row ? mapPendingActivationRow(row) : null;
}

export function findActivationCodeByDeviceCode(deviceCode: string): string {
  initOpsTables();
  const normalizedDeviceCode = deviceCode.trim();
  if (!normalizedDeviceCode) {
    return "";
  }
  const db = getDigitalHumanDb();
  const pendingRow = db.prepare(`
    select activation_code from pending_activation_requests
    where device_code = ?
    limit 1
  `).get(normalizedDeviceCode) as { activation_code: string } | undefined;
  if (pendingRow?.activation_code?.trim()) {
    return pendingRow.activation_code.trim();
  }
  const activationRow = db.prepare(`
    select activation_code from digital_human_activation_codes
    where device_code = ?
    order by datetime(published_at) desc
    limit 1
  `).get(normalizedDeviceCode) as { activation_code: string } | undefined;
  return activationRow?.activation_code?.trim() || "";
}

export function approvePendingActivationRequest(
  requestId: string,
  payload: PendingActivationApprovePayload,
  approver?: { id: string; username: string },
): PendingActivationRequest {
  initOpsTables();
  const db = getDigitalHumanDb();
  const existing = db.prepare(`
    select * from pending_activation_requests
    where id = ?
    limit 1
  `).get(requestId) as PendingActivationRow | undefined;
  if (!existing) {
    throw new Error("待激活请求不存在");
  }

  ensureDigitalHuman(payload.digitalHumanId);
  const now = new Date().toISOString();
  const activation = createActivationCode(payload.digitalHumanId, {
    deviceCode: existing.device_code,
    deviceName: existing.device_name,
    remark: "无感激活自动生成",
  });
  db.prepare(`
    update digital_human_activation_codes
    set activation_code = ?,
        activation_code_masked = ?,
        status = 'activated',
        activated_at = ?,
        app_version = ?,
        device_name = case when trim(device_name) = '' then ? else device_name end
    where id = ?
  `).run(
    existing.activation_code,
    existing.activation_code_masked,
    now,
    existing.app_version,
    existing.device_name,
    activation.id,
  );

  upsertActivatedDevice(payload.digitalHumanId, {
    deviceCode: existing.device_code,
    deviceName: existing.device_name || existing.device_code,
    appVersion: existing.app_version,
    approvedByUserId: approver?.id ?? null,
    approvedByUsername: approver?.username ?? "",
  });
  createPublish(payload.digitalHumanId, {
    summary: `同意设备 ${existing.device_code} 无感激活`,
    publishScope: "partial",
    remark: existing.device_name ? `设备名称：${existing.device_name}` : "无感激活自动审批记录",
  });

  db.prepare(`
    update pending_activation_requests
    set status = 'approved',
        digital_human_id = ?,
        approved_at = ?,
        activation_code = ?,
        activation_code_masked = ?,
        updated_at = ?
    where id = ?
  `).run(
    payload.digitalHumanId,
    now,
    existing.activation_code,
    existing.activation_code_masked,
    now,
    requestId,
  );

  return mapPendingActivationRow(db.prepare(`
    select * from pending_activation_requests where id = ?
  `).get(requestId) as PendingActivationRow);
}

export function saveDevices(digitalHumanId: string, payload: DevicePayload): DeviceCollection {
  ensureDigitalHuman(digitalHumanId);
  const db = getDigitalHumanDb();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare("delete from digital_human_devices where digital_human_id = ?").run(digitalHumanId);
    const insert = db.prepare(`
      insert into digital_human_devices (
        id, digital_human_id, device_code, device_name, bind_status,
        app_version, last_sync_at, approved_by_user_id, approved_by_username, updated_at
      ) values (
        @id, @digital_human_id, @device_code, @device_name, @bind_status,
        @app_version, @last_sync_at, @approved_by_user_id, @approved_by_username, @updated_at
      )
    `);
    payload.devices.forEach((device, index) => {
      insert.run({
        id: device.id?.trim() || `${randomUUID()}-${index}`,
        digital_human_id: digitalHumanId,
        device_code: device.deviceCode.trim(),
        device_name: device.deviceName.trim(),
        bind_status: device.bindStatus,
        app_version: device.appVersion.trim(),
        last_sync_at: now,
        approved_by_user_id: device.approvedByUserId ?? null,
        approved_by_username: device.approvedByUsername ?? "",
        updated_at: now,
      });
    });
  });
  tx();
  return getDevices(digitalHumanId);
}

export function deleteActivatedDevice(digitalHumanId: string, payload: DeviceDeletePayload): DeviceCollection {
  ensureDigitalHuman(digitalHumanId);
  initOpsTables();
  const db = getDigitalHumanDb();
  const deviceCode = payload.deviceCode.trim();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(`
      delete from digital_human_devices
      where digital_human_id = ? and device_code = ?
    `).run(digitalHumanId, deviceCode);

    db.prepare(`
      update pending_activation_requests
      set status = 'pending',
          digital_human_id = null,
          approved_at = null,
          updated_at = ?
      where device_code = ?
    `).run(now, deviceCode);
  });
  tx();
  return getDevices(digitalHumanId);
}

export function deleteDigitalHumanBundle(digitalHumanId: string): boolean {
  initOpsTables();
  const db = getDigitalHumanDb();
  if (!getDigitalHuman(digitalHumanId)) {
    return false;
  }

  const tx = db.transaction(() => {
    db.prepare("delete from digital_human_interactions where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_fixed_qa where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_faq where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_hotwords where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_publish_records where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_devices where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_human_activation_codes where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from pending_activation_requests where digital_human_id = ?").run(digitalHumanId);
    db.prepare(`
      delete from digital_human_video_items
      where config_version_id in (
        select id from digital_human_config_versions where digital_human_id = ?
      )
    `).run(digitalHumanId);
    db.prepare("delete from digital_human_config_versions where digital_human_id = ?").run(digitalHumanId);
    db.prepare("delete from digital_humans where id = ?").run(digitalHumanId);
  });

  tx();
  return true;
}

function ensureDigitalHuman(digitalHumanId: string) {
  initOpsTables();
  if (!getDigitalHuman(digitalHumanId)) {
    throw new Error("Digital human not found");
  }
}

function upsertJsonRow(table: string, digitalHumanId: string, payload: unknown) {
  const now = new Date().toISOString();
  getDigitalHumanDb()
    .prepare(`
      insert into ${table} (digital_human_id, payload_json, updated_at)
      values (?, ?, ?)
      on conflict(digital_human_id) do update set
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `)
    .run(digitalHumanId, JSON.stringify(payload), now);
}

function readJsonRow<T>(table: string, digitalHumanId: string, fallback: T): T {
  const row = getDigitalHumanDb()
    .prepare(`select payload_json from ${table} where digital_human_id = ?`)
    .get(digitalHumanId) as JsonRow | undefined;
  if (!row?.payload_json) {
    return fallback;
  }
  return JSON.parse(row.payload_json) as T;
}

function seedOpsForHuman(digitalHumanId: string) {
  if (!getDigitalHuman(digitalHumanId)) return;
  const db = getDigitalHumanDb();

  const interaction = db
    .prepare("select 1 from digital_human_interactions where digital_human_id = ?")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!interaction) {
    upsertJsonRow("digital_human_interactions", digitalHumanId, defaultInteractionSettings());
  }

  const fixedQa = db
    .prepare("select 1 from digital_human_fixed_qa where digital_human_id = ?")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!fixedQa) {
    upsertJsonRow("digital_human_fixed_qa", digitalHumanId, defaultFixedQa());
  }

  const faq = db
    .prepare("select 1 from digital_human_faq where digital_human_id = ?")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!faq) {
    upsertJsonRow("digital_human_faq", digitalHumanId, defaultFaq());
  }

  const hotwords = db
    .prepare("select 1 from digital_human_hotwords where digital_human_id = ?")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!hotwords) {
    upsertJsonRow("digital_human_hotwords", digitalHumanId, defaultHotwords());
  }

  const devices = db
    .prepare("select 1 from digital_human_devices where digital_human_id = ? limit 1")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!devices) {
    const now = new Date().toISOString();
    const insert = db.prepare(`
      insert into digital_human_devices (
        id, digital_human_id, device_code, device_name, bind_status,
        app_version, last_sync_at, approved_by_user_id, approved_by_username, updated_at
      ) values (
        @id, @digital_human_id, @device_code, @device_name, @bind_status,
        @app_version, @last_sync_at, @approved_by_user_id, @approved_by_username, @updated_at
      )
    `);
    [
      { deviceCode: "android-screen-001", deviceName: "大厅主屏", bindStatus: "active", appVersion: "1.0.0" },
      { deviceCode: "android-terminal-002", deviceName: "政务终端", bindStatus: "active", appVersion: "1.0.0" },
    ].forEach((device) => {
      insert.run({
        id: randomUUID(),
        digital_human_id: digitalHumanId,
        device_code: device.deviceCode,
        device_name: device.deviceName,
        bind_status: device.bindStatus,
        app_version: device.appVersion,
        last_sync_at: now,
        approved_by_user_id: null,
        approved_by_username: "",
        updated_at: now,
      });
    });
  }

  const publish = db
    .prepare("select 1 from digital_human_publish_records where digital_human_id = ? limit 1")
    .get(digitalHumanId) as { 1: number } | undefined;
  if (!publish) {
    const currentVersion = getCurrentConfigVersion(digitalHumanId);
    db.prepare(`
      insert into digital_human_publish_records (
        id, digital_human_id, config_version_id, publish_version,
        publish_scope, summary, remark, status, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      digitalHumanId,
      currentVersion?.id ?? null,
      "v1.0.1",
      "all",
      "初始配置发布",
      "系统自动生成",
      "completed",
      new Date().toISOString(),
    );
  }
}

function upsertActivatedDevice(
  digitalHumanId: string,
  payload: { deviceCode: string; deviceName: string; appVersion: string; approvedByUserId?: string | null; approvedByUsername?: string },
) {
  const db = getDigitalHumanDb();
  const now = new Date().toISOString();
  const existing = db.prepare(`
    select id from digital_human_devices
    where digital_human_id = ? and device_code = ?
    limit 1
  `).get(digitalHumanId, payload.deviceCode) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      update digital_human_devices
      set device_name = ?,
          bind_status = 'active',
          app_version = ?,
          last_sync_at = ?,
          approved_by_user_id = ?,
          approved_by_username = ?,
          updated_at = ?
      where id = ?
    `).run(payload.deviceName, payload.appVersion, now, payload.approvedByUserId ?? null, payload.approvedByUsername ?? "", now, existing.id);
    return;
  }

  db.prepare(`
    insert into digital_human_devices (
      id, digital_human_id, device_code, device_name, bind_status,
      app_version, last_sync_at, approved_by_user_id, approved_by_username, updated_at
    ) values (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(randomUUID(), digitalHumanId, payload.deviceCode, payload.deviceName, payload.appVersion, now, payload.approvedByUserId ?? null, payload.approvedByUsername ?? "", now);
}

function ensureOpsTableColumns(db: ReturnType<typeof getDigitalHumanDb>) {
  const deviceColumns = db.prepare("pragma table_info(digital_human_devices)").all() as Array<{ name: string }>;
  const deviceColumnNames = new Set(deviceColumns.map((item) => item.name));
  if (!deviceColumnNames.has("approved_by_user_id")) {
    db.exec("alter table digital_human_devices add column approved_by_user_id text");
  }
  if (!deviceColumnNames.has("approved_by_username")) {
    db.exec("alter table digital_human_devices add column approved_by_username text not null default ''");
  }
}

function mapActivationCodeRow(row: ActivationCodeRow): ActivationCodeRecord {
  return {
    id: row.id,
    digitalHumanId: row.digital_human_id,
    deviceCode: row.device_code,
    deviceName: row.device_name,
    activationCode: row.activation_code,
    activationCodeMasked: row.activation_code_masked,
    status: row.status,
    remark: row.remark,
    publishedAt: row.published_at,
    activatedAt: row.activated_at,
    appVersion: row.app_version,
  };
}

function mapPendingActivationRow(row: PendingActivationRow): PendingActivationRequest {
  return {
    id: row.id,
    deviceCode: row.device_code,
    deviceName: row.device_name,
    appVersion: row.app_version,
    activationCode: row.activation_code,
    activationCodeMasked: row.activation_code_masked,
    status: row.status,
    digitalHumanId: row.digital_human_id,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    requestCount: row.request_count,
  };
}

function generateActivationCodeValue() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 8; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${value.slice(0, 4)}-${value.slice(4, 8)}`;
}

function maskActivationCode(value: string) {
  if (value.length <= 4) return value;
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function defaultInteractionSettings(): InteractionSettings {
  return {
    openingMessages: ["您好，我是石拐公安图警官，很高兴为您服务。", "请问有什么可以帮您？"],
    wakeWords: ["阿喜警官", "警官"],
    standbyCommands: ["回到首页", "暂停服务"],
    interruptWords: ["停一下", "换个问题"],
    fallbackMessages: ["这个问题我暂时没有查到准确答案，建议您咨询现场工作人员。"],
  };
}

function defaultFixedQa(): QaCollection {
  return {
    items: [
      { id: randomUUID(), question: "身份证在哪里办理？", answer: "请到一楼户政窗口办理。", status: "enabled" },
      { id: randomUUID(), question: "户籍证明需要什么材料？", answer: "请携带身份证、户口簿等材料。", status: "enabled" },
      { id: randomUUID(), question: "可以线上预约吗？", answer: "支持线上预约，建议提前一天提交。", status: "pending" },
    ],
  };
}

function defaultFaq(): QaCollection {
  return {
    items: [
      { id: randomUUID(), question: "办理身份证多久能拿到？", answer: "一般 15 个工作日左右。", status: "enabled" },
      { id: randomUUID(), question: "临时身份证怎么办？", answer: "可在户政窗口申请办理。", status: "enabled" },
      { id: randomUUID(), question: "周末能办理业务吗？", answer: "请关注大厅公告和预约平台。", status: "pending" },
    ],
  };
}

function defaultHotwords(): HotwordCollection {
  return {
    groups: [
      { id: randomUUID(), name: "公安业务词", words: ["身份证", "户籍", "居住证", "证明开具"], type: "business", enabled: true },
      { id: randomUUID(), name: "运营热词", words: ["反诈宣传月", "平安建设"], type: "campaign", enabled: true },
      { id: randomUUID(), name: "敏感词", words: ["投诉", "纠纷", "报警", "隐私"], type: "sensitive", enabled: true },
    ],
  };
}
