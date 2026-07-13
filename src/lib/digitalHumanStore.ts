import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID, createHash } from "crypto";
import { maskValue } from "@/lib/config";
import type {
  DigitalHumanConfigInput,
  DigitalHumanCreateInput,
  DigitalHumanUpdateInput,
} from "@/lib/digitalHumanValidation";

export type DigitalHumanStatus = "draft" | "enabled" | "disabled" | "archived";
export type ConfigVersionStatus = "draft" | "published" | "archived";

export type VideoItem = {
  uri: string;
  displayName: string;
};

export type DigitalHumanConfig = {
  onboardingCompleted: boolean;
  dashscopeApiKey: string;
  llmModel: string;
  asrModel: string;
  systemPrompt: string;
  prefixPrompt: string;
  openingMessage: string;
  live2dModelPath: string;
  ttsModel: string;
  ttsVoice: string;
  baseUrl: string;
  knowledgeBaseIndexId: string;
  selectedFixedQaIds: string[];
  wakeWordEnabled: boolean;
  wakeWordText: string;
  videoLoopMode: "playlist" | "single";
  videoOrientation: "landscape" | "portrait";
  videoSingleUri: string;
  weatherCity: string;
  fontScale: number;
  modelScale: number;
  wakeWordHintOffsetDp: number;
  frontCameraRotationDegrees: number;
  frontCameraDiameterDp: number;
  activationCode: string;
  activatedFingerprint: string;
  activationUnlocked: boolean;
  videoItems: VideoItem[];
};

export type DigitalHuman = {
  id: string;
  code: string;
  name: string;
  sceneType: string;
  assistantName: string;
  status: DigitalHumanStatus;
  description: string;
  currentConfigVersionId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DigitalHumanListItem = DigitalHuman & {
  currentVersionNo: number | null;
  currentVersionStatus: ConfigVersionStatus | null;
  currentConfigUpdatedAt: string | null;
};

export type DigitalHumanConfigVersion = {
  id: string;
  digitalHumanId: string;
  versionNo: number;
  status: ConfigVersionStatus;
  configHash: string;
  configJson: string;
  dashscopeApiKeyMasked: string;
  activationCodeMasked: string;
  llmModel: string;
  asrModel: string;
  ttsModel: string;
  ttsVoice: string;
  baseUrl: string;
  knowledgeBaseIndexId: string;
  selectedFixedQaIds: string[];
  wakeWordEnabled: boolean;
  wakeWordText: string;
  videoLoopMode: string;
  videoOrientation: string;
  weatherCity: string;
  fontScale: number;
  modelScale: number;
  wakeWordHintOffsetDp: number;
  frontCameraRotationDegrees: number;
  frontCameraDiameterDp: number;
  remark: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  config: DigitalHumanConfig;
};

type DigitalHumanRow = {
  id: string;
  code: string;
  name: string;
  scene_type: string;
  assistant_name: string;
  status: string;
  description: string;
  current_config_version_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  current_version_no?: number | null;
  current_version_status?: string | null;
  current_config_updated_at?: string | null;
};

type ConfigVersionRow = {
  id: string;
  digital_human_id: string;
  version_no: number;
  status: string;
  config_hash: string;
  config_json: string;
  dashscope_api_key_masked: string;
  activation_code_masked: string;
  llm_model: string;
  asr_model: string;
  tts_model: string;
  tts_voice: string;
  base_url: string;
  knowledge_base_index_id: string;
  selected_fixed_qa_ids_json: string;
  wake_word_enabled: number;
  wake_word_text: string;
  video_loop_mode: string;
  video_orientation: string;
  weather_city: string;
  font_scale: number;
  model_scale: number;
  wake_word_hint_offset_dp: number;
  front_camera_rotation_degrees: number;
  front_camera_diameter_dp: number;
  remark: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type VideoItemRow = {
  id: string;
  config_version_id: string;
  uri: string;
  display_name: string;
  sort_order: number;
  created_at: string;
};

let db: Database.Database | null = null;

export function getDigitalHumanDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  db = new Database(path.join(dataDir, "digital_humans.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists digital_humans (
      id text primary key,
      code text not null unique,
      name text not null,
      scene_type text not null default '',
      assistant_name text not null default '',
      status text not null default 'draft',
      description text not null default '',
      current_config_version_id text,
      created_by text,
      updated_by text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists digital_human_config_versions (
      id text primary key,
      digital_human_id text not null,
      version_no integer not null,
      status text not null default 'draft',
      config_hash text not null,
      config_json text not null,
      dashscope_api_key_masked text not null default '',
      activation_code_masked text not null default '',
      llm_model text not null default '',
      asr_model text not null default '',
      tts_model text not null default '',
      tts_voice text not null default '',
      base_url text not null default '',
      knowledge_base_index_id text not null default '',
      selected_fixed_qa_ids_json text not null default '[]',
      wake_word_enabled integer not null default 1,
      wake_word_text text not null default '',
      video_loop_mode text not null default 'playlist',
      video_orientation text not null default 'landscape',
      weather_city text not null default '',
      font_scale real not null default 1.0,
      model_scale real not null default 0.95,
      wake_word_hint_offset_dp integer not null default 0,
      front_camera_rotation_degrees integer not null default 0,
      front_camera_diameter_dp integer not null default 0,
      remark text not null default '',
      created_by text,
      created_at text not null,
      updated_at text not null
    );
    create unique index if not exists idx_digital_human_config_versions_version
      on digital_human_config_versions(digital_human_id, version_no);

    create table if not exists digital_human_video_items (
      id text primary key,
      config_version_id text not null,
      uri text not null,
      display_name text not null default '',
      sort_order integer not null default 0,
      created_at text not null
    );
    create index if not exists idx_digital_human_video_items_config
      on digital_human_video_items(config_version_id, sort_order);
  `);
  ensureColumnExists(db, "digital_human_config_versions", "knowledge_base_index_id", "text not null default ''");
  ensureColumnExists(db, "digital_human_config_versions", "selected_fixed_qa_ids_json", "text not null default '[]'");

  seedDefaultDigitalHuman(db);
  return db;
}

export function listDigitalHumans(): DigitalHumanListItem[] {
  const rows = getDigitalHumanDb()
    .prepare(`
      select
        dh.*,
        cfg.version_no as current_version_no,
        cfg.status as current_version_status,
        cfg.updated_at as current_config_updated_at
      from digital_humans dh
      left join digital_human_config_versions cfg
        on cfg.id = dh.current_config_version_id
      order by datetime(dh.updated_at) desc
    `)
    .all() as DigitalHumanRow[];
  return rows.map(deserializeDigitalHumanListItem);
}

export function getDigitalHuman(id: string): DigitalHuman | null {
  const row = getDigitalHumanDb()
    .prepare("select * from digital_humans where id = ?")
    .get(id) as DigitalHumanRow | undefined;
  return row ? deserializeDigitalHuman(row) : null;
}

export function createDigitalHuman(input: DigitalHumanCreateInput): DigitalHuman {
  const now = new Date().toISOString();
  const record: DigitalHuman = {
    id: randomUUID(),
    code: input.code.trim(),
    name: input.name.trim(),
    sceneType: input.sceneType?.trim() ?? "",
    assistantName: input.assistantName?.trim() ?? "",
    status: input.status ?? "draft",
    description: input.description?.trim() ?? "",
    currentConfigVersionId: null,
    createdBy: "system",
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  };

  getDigitalHumanDb()
    .prepare(`
      insert into digital_humans (
        id, code, name, scene_type, assistant_name, status, description,
        current_config_version_id, created_by, updated_by, created_at, updated_at
      ) values (
        @id, @code, @name, @scene_type, @assistant_name, @status, @description,
        @current_config_version_id, @created_by, @updated_by, @created_at, @updated_at
      )
    `)
    .run(serializeDigitalHuman(record));

  return record;
}

export function updateDigitalHuman(id: string, patch: DigitalHumanUpdateInput): DigitalHuman | null {
  const current = getDigitalHuman(id);
  if (!current) return null;

  const next: DigitalHuman = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    sceneType: patch.sceneType?.trim() ?? current.sceneType,
    assistantName: patch.assistantName?.trim() ?? current.assistantName,
    description: patch.description?.trim() ?? current.description,
    status: (patch.status as DigitalHumanStatus | undefined) ?? current.status,
    currentConfigVersionId: patch.currentConfigVersionId ?? current.currentConfigVersionId,
    updatedBy: "system",
    updatedAt: new Date().toISOString(),
  };

  getDigitalHumanDb()
    .prepare(`
      update digital_humans set
        name = @name,
        scene_type = @scene_type,
        assistant_name = @assistant_name,
        status = @status,
        description = @description,
        current_config_version_id = @current_config_version_id,
        updated_by = @updated_by,
        updated_at = @updated_at
      where id = @id
    `)
    .run(serializeDigitalHuman(next));

  return next;
}

export function listConfigVersions(digitalHumanId: string): DigitalHumanConfigVersion[] {
  const rows = getDigitalHumanDb()
    .prepare(`
      select * from digital_human_config_versions
      where digital_human_id = ?
      order by version_no desc
    `)
    .all(digitalHumanId) as ConfigVersionRow[];
  return rows.map(deserializeConfigVersion);
}

export function getConfigVersion(versionId: string): DigitalHumanConfigVersion | null {
  const row = getDigitalHumanDb()
    .prepare("select * from digital_human_config_versions where id = ?")
    .get(versionId) as ConfigVersionRow | undefined;
  return row ? deserializeConfigVersion(row) : null;
}

export function getCurrentConfigVersion(digitalHumanId: string): DigitalHumanConfigVersion | null {
  const human = getDigitalHuman(digitalHumanId);
  if (!human?.currentConfigVersionId) {
    return null;
  }
  return getConfigVersion(human.currentConfigVersionId);
}

export function saveConfigVersion(digitalHumanId: string, patch: DigitalHumanConfigInput): DigitalHumanConfigVersion {
  const human = getDigitalHuman(digitalHumanId);
  if (!human) {
    throw new Error("Digital human not found");
  }

  const currentVersion = getCurrentConfigVersion(digitalHumanId);
  const mergedConfig = normalizeConfig({
    ...(currentVersion?.config ?? defaultConfig()),
    ...patch,
    videoItems: patch.videoItems ?? currentVersion?.config.videoItems ?? [],
  });
  const nextVersionNo = currentVersion ? currentVersion.versionNo + 1 : 1;
  const now = new Date().toISOString();
  const record: DigitalHumanConfigVersion = {
    id: randomUUID(),
    digitalHumanId,
    versionNo: nextVersionNo,
    status: "draft",
    configHash: hashConfig(mergedConfig),
    configJson: JSON.stringify(mergedConfig),
    dashscopeApiKeyMasked: maskSecret(mergedConfig.dashscopeApiKey),
    activationCodeMasked: maskSecret(mergedConfig.activationCode),
    llmModel: mergedConfig.llmModel,
    asrModel: mergedConfig.asrModel,
    ttsModel: mergedConfig.ttsModel,
    ttsVoice: mergedConfig.ttsVoice,
    baseUrl: mergedConfig.baseUrl,
    knowledgeBaseIndexId: mergedConfig.knowledgeBaseIndexId,
    selectedFixedQaIds: mergedConfig.selectedFixedQaIds,
    wakeWordEnabled: mergedConfig.wakeWordEnabled,
    wakeWordText: mergedConfig.wakeWordText,
    videoLoopMode: mergedConfig.videoLoopMode,
    videoOrientation: mergedConfig.videoOrientation,
    weatherCity: mergedConfig.weatherCity,
    fontScale: mergedConfig.fontScale,
    modelScale: mergedConfig.modelScale,
    wakeWordHintOffsetDp: mergedConfig.wakeWordHintOffsetDp,
    frontCameraRotationDegrees: mergedConfig.frontCameraRotationDegrees,
    frontCameraDiameterDp: mergedConfig.frontCameraDiameterDp,
    remark: patch.remark?.trim() ?? "",
    createdBy: "system",
    createdAt: now,
    updatedAt: now,
    config: mergedConfig,
  };

  const tx = getDigitalHumanDb().transaction(() => {
    getDigitalHumanDb()
      .prepare(`
        insert into digital_human_config_versions (
          id, digital_human_id, version_no, status, config_hash, config_json,
          dashscope_api_key_masked, activation_code_masked, llm_model, asr_model,
          tts_model, tts_voice, base_url, knowledge_base_index_id, selected_fixed_qa_ids_json,
          wake_word_enabled, wake_word_text,
          video_loop_mode, video_orientation, weather_city, font_scale, model_scale,
          wake_word_hint_offset_dp, front_camera_rotation_degrees, front_camera_diameter_dp,
          remark, created_by, created_at, updated_at
        ) values (
          @id, @digital_human_id, @version_no, @status, @config_hash, @config_json,
          @dashscope_api_key_masked, @activation_code_masked, @llm_model, @asr_model,
          @tts_model, @tts_voice, @base_url, @knowledge_base_index_id, @selected_fixed_qa_ids_json,
          @wake_word_enabled, @wake_word_text,
          @video_loop_mode, @video_orientation, @weather_city, @font_scale, @model_scale,
          @wake_word_hint_offset_dp, @front_camera_rotation_degrees, @front_camera_diameter_dp,
          @remark, @created_by, @created_at, @updated_at
        )
      `)
      .run(serializeConfigVersion(record));

    getDigitalHumanDb()
      .prepare("delete from digital_human_video_items where config_version_id = ?")
      .run(record.id);

    const insertVideo = getDigitalHumanDb().prepare(`
      insert into digital_human_video_items (
        id, config_version_id, uri, display_name, sort_order, created_at
      ) values (
        @id, @config_version_id, @uri, @display_name, @sort_order, @created_at
      )
    `);
    mergedConfig.videoItems.forEach((item, index) => {
      insertVideo.run({
        id: randomUUID(),
        config_version_id: record.id,
        uri: item.uri,
        display_name: item.displayName,
        sort_order: index,
        created_at: now,
      });
    });

    getDigitalHumanDb()
      .prepare(`
        update digital_humans set
          current_config_version_id = ?,
          updated_by = ?,
          updated_at = ?
        where id = ?
      `)
      .run(record.id, "system", now, digitalHumanId);
  });

  tx();
  return getConfigVersion(record.id) as DigitalHumanConfigVersion;
}

function seedDefaultDigitalHuman(database: Database.Database) {
  const countRow = database.prepare("select count(1) as count from digital_humans").get() as { count: number };
  if (countRow.count > 0) {
    return;
  }

  const human = createDigitalHuman({
    code: "shiguai-police-001",
    name: "石拐公安图警官",
    sceneType: "公安政务大厅",
    assistantName: "石拐公安图警官",
    description: "默认种子数字人，用于管理后台联调。",
    status: "enabled",
  });

  saveConfigVersion(human.id, {
    dashscopeApiKey: "sk-demo-mask-value",
    llmModel: "qwen-plus",
    asrModel: "qwen3-asr-flash-realtime",
    systemPrompt: "你是部署在大厅里的公安数字人，回答需简洁、准确、亲和，优先参考固定问答和知识库。",
    prefixPrompt: "请优先结合当前政务大厅场景回答，并在结尾自然追问用户是否还需要办理时间、窗口位置或所需材料。",
    openingMessage: "您好，我是石拐公安图警官，很高兴为您服务，请问有什么可以帮您？",
    live2dModelPath: "assets/models/police1124/警察拆.model3.json",
    ttsModel: "cosyvoice-v3-flash",
    ttsVoice: "longanyang",
    baseUrl: "https://dashscope.aliyuncs.com",
    wakeWordEnabled: true,
    wakeWordText: "阿喜警官",
    weatherCity: "包头",
    fontScale: 1.3,
    modelScale: 0.95,
    frontCameraDiameterDp: 160,
    videoItems: [
      { uri: "file://videos/待机宣传片01.mp4", displayName: "待机宣传片01.mp4" },
      { uri: "file://videos/警务宣传片02.mp4", displayName: "警务宣传片02.mp4" },
    ],
  });
}

function defaultConfig(): DigitalHumanConfig {
  return {
    onboardingCompleted: true,
    dashscopeApiKey: "",
    llmModel: "qwen-plus",
    asrModel: "qwen3-asr-flash-realtime",
    systemPrompt: "",
    prefixPrompt: "",
    openingMessage: "",
    live2dModelPath: "",
    ttsModel: "cosyvoice-v3-flash",
    ttsVoice: "longanyang",
    baseUrl: "https://dashscope.aliyuncs.com",
    knowledgeBaseIndexId: "",
    selectedFixedQaIds: [],
    wakeWordEnabled: true,
    wakeWordText: "",
    videoLoopMode: "playlist",
    videoOrientation: "landscape",
    videoSingleUri: "",
    weatherCity: "",
    fontScale: 1.0,
    modelScale: 0.95,
    wakeWordHintOffsetDp: 0,
    frontCameraRotationDegrees: 0,
    frontCameraDiameterDp: 0,
    activationCode: "",
    activatedFingerprint: "",
    activationUnlocked: false,
    videoItems: [],
  };
}

function normalizeConfig(input: Partial<DigitalHumanConfig>): DigitalHumanConfig {
  const base = defaultConfig();
  return {
    ...base,
    ...input,
    dashscopeApiKey: normalizeString(input.dashscopeApiKey ?? base.dashscopeApiKey),
    llmModel: normalizeString(input.llmModel ?? base.llmModel),
    asrModel: normalizeString(input.asrModel ?? base.asrModel),
    systemPrompt: normalizeString(input.systemPrompt ?? base.systemPrompt),
    prefixPrompt: normalizeString(input.prefixPrompt ?? base.prefixPrompt),
    openingMessage: normalizeString(input.openingMessage ?? base.openingMessage),
    live2dModelPath: normalizeString(input.live2dModelPath ?? base.live2dModelPath),
    ttsModel: normalizeString(input.ttsModel ?? base.ttsModel),
    ttsVoice: normalizeString(input.ttsVoice ?? base.ttsVoice),
    baseUrl: normalizeString(input.baseUrl ?? base.baseUrl),
    knowledgeBaseIndexId: normalizeString(input.knowledgeBaseIndexId ?? base.knowledgeBaseIndexId),
    selectedFixedQaIds: Array.isArray(input.selectedFixedQaIds) ? input.selectedFixedQaIds.map((item) => normalizeString(item)).filter(Boolean) : base.selectedFixedQaIds,
    wakeWordText: normalizeString(input.wakeWordText ?? base.wakeWordText),
    videoLoopMode: input.videoLoopMode === "single" ? "single" : "playlist",
    videoOrientation: input.videoOrientation === "portrait" ? "portrait" : "landscape",
    videoSingleUri: normalizeString(input.videoSingleUri ?? base.videoSingleUri),
    weatherCity: normalizeString(input.weatherCity ?? base.weatherCity),
    wakeWordHintOffsetDp: normalizeInt(input.wakeWordHintOffsetDp, base.wakeWordHintOffsetDp),
    frontCameraRotationDegrees: normalizeRotation(input.frontCameraRotationDegrees ?? base.frontCameraRotationDegrees),
    frontCameraDiameterDp: normalizeInt(input.frontCameraDiameterDp, base.frontCameraDiameterDp),
    activationCode: normalizeString(input.activationCode ?? base.activationCode),
    activatedFingerprint: normalizeString(input.activatedFingerprint ?? base.activatedFingerprint),
    videoItems: normalizeVideoItems(input.videoItems ?? base.videoItems),
    fontScale: normalizeNumber(input.fontScale, base.fontScale),
    modelScale: normalizeNumber(input.modelScale, base.modelScale),
    onboardingCompleted: Boolean(input.onboardingCompleted ?? base.onboardingCompleted),
    wakeWordEnabled: Boolean(input.wakeWordEnabled ?? base.wakeWordEnabled),
    activationUnlocked: Boolean(input.activationUnlocked ?? base.activationUnlocked),
  };
}

function normalizeVideoItems(items: VideoItem[]): VideoItem[] {
  return items
    .map((item) => ({
      uri: normalizeString(item.uri),
      displayName: normalizeString(item.displayName),
    }))
    .filter((item) => item.uri);
}

function normalizeRotation(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return [0, 90, 180, 270].includes(normalized) ? normalized : 0;
}

function normalizeNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeInt(value: number | undefined, fallback: number) {
  return Number.isInteger(value) ? Number(value) : fallback;
}

function normalizeString(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function hashConfig(config: DigitalHumanConfig) {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

function maskSecret(value: string) {
  return value ? maskValue(value) : "";
}

function serializeDigitalHuman(record: DigitalHuman) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    scene_type: record.sceneType,
    assistant_name: record.assistantName,
    status: record.status,
    description: record.description,
    current_config_version_id: record.currentConfigVersionId,
    created_by: record.createdBy,
    updated_by: record.updatedBy,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function serializeConfigVersion(record: DigitalHumanConfigVersion) {
  return {
    id: record.id,
    digital_human_id: record.digitalHumanId,
    version_no: record.versionNo,
    status: record.status,
    config_hash: record.configHash,
    config_json: JSON.stringify(record.config),
    dashscope_api_key_masked: record.dashscopeApiKeyMasked,
    activation_code_masked: record.activationCodeMasked,
    llm_model: record.llmModel,
    asr_model: record.asrModel,
    tts_model: record.ttsModel,
    tts_voice: record.ttsVoice,
    base_url: record.baseUrl,
    knowledge_base_index_id: record.config.knowledgeBaseIndexId,
    selected_fixed_qa_ids_json: JSON.stringify(record.config.selectedFixedQaIds),
    wake_word_enabled: record.wakeWordEnabled ? 1 : 0,
    wake_word_text: record.wakeWordText,
    video_loop_mode: record.videoLoopMode,
    video_orientation: record.videoOrientation,
    weather_city: record.weatherCity,
    font_scale: record.fontScale,
    model_scale: record.modelScale,
    wake_word_hint_offset_dp: record.wakeWordHintOffsetDp,
    front_camera_rotation_degrees: record.frontCameraRotationDegrees,
    front_camera_diameter_dp: record.frontCameraDiameterDp,
    remark: record.remark,
    created_by: record.createdBy,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function deserializeDigitalHuman(row: DigitalHumanRow): DigitalHuman {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sceneType: row.scene_type ?? "",
    assistantName: row.assistant_name ?? "",
    status: (row.status as DigitalHumanStatus) ?? "draft",
    description: row.description ?? "",
    currentConfigVersionId: row.current_config_version_id ?? null,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deserializeDigitalHumanListItem(row: DigitalHumanRow): DigitalHumanListItem {
  return {
    ...deserializeDigitalHuman(row),
    currentVersionNo: row.current_version_no ?? null,
    currentVersionStatus: (row.current_version_status as ConfigVersionStatus | null) ?? null,
    currentConfigUpdatedAt: row.current_config_updated_at ?? null,
  };
}

function deserializeConfigVersion(row: ConfigVersionRow): DigitalHumanConfigVersion {
  const config = normalizeConfig(JSON.parse(row.config_json) as Partial<DigitalHumanConfig>);
  const videoRows = getDigitalHumanDb()
    .prepare(`
      select * from digital_human_video_items
      where config_version_id = ?
      order by sort_order asc, created_at asc
    `)
    .all(row.id) as VideoItemRow[];
  config.videoItems = videoRows.map((item) => ({
    uri: item.uri,
    displayName: item.display_name,
  }));

  return {
    id: row.id,
    digitalHumanId: row.digital_human_id,
    versionNo: row.version_no,
    status: (row.status as ConfigVersionStatus) ?? "draft",
    configHash: row.config_hash,
    configJson: row.config_json,
    dashscopeApiKeyMasked: row.dashscope_api_key_masked ?? "",
    activationCodeMasked: row.activation_code_masked ?? "",
    llmModel: row.llm_model ?? "",
    asrModel: row.asr_model ?? "",
    ttsModel: row.tts_model ?? "",
    ttsVoice: row.tts_voice ?? "",
    baseUrl: row.base_url ?? "",
    knowledgeBaseIndexId: row.knowledge_base_index_id ?? "",
    selectedFixedQaIds: parseStringArray(row.selected_fixed_qa_ids_json),
    wakeWordEnabled: Boolean(row.wake_word_enabled),
    wakeWordText: row.wake_word_text ?? "",
    videoLoopMode: row.video_loop_mode ?? "playlist",
    videoOrientation: row.video_orientation ?? "landscape",
    weatherCity: row.weather_city ?? "",
    fontScale: row.font_scale ?? 1,
    modelScale: row.model_scale ?? 0.95,
    wakeWordHintOffsetDp: row.wake_word_hint_offset_dp ?? 0,
    frontCameraRotationDegrees: row.front_camera_rotation_degrees ?? 0,
    frontCameraDiameterDp: row.front_camera_diameter_dp ?? 0,
    remark: row.remark ?? "",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config,
  };
}

function parseStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function ensureColumnExists(database: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = database.prepare(`pragma table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`alter table ${tableName} add column ${columnName} ${definition}`);
  }
}
