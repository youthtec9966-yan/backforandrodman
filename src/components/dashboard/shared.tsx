"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { IndexItem } from "@/components/KnowledgeManagement";
import type {
  ApiEnvelope,
  CreateRoleFormState,
  DeviceBinding,
  DigitalHumanConfig,
  DigitalHumanConfigVersion,
  DigitalHumanRecord,
  DigitalHumanStatus,
  HotwordGroup,
  InteractionData,
  LoadingState,
  NavItem,
  OverviewTab,
  QaData,
  QaItem,
  SectionKey,
  SettingsFormState,
  UserRole,
  UserStatus,
  VideoItem,
  Live2dModelOption,
} from "@/components/dashboard/types";
import { ROLE_FIXED_QA_PRESETS } from "@/components/dashboard/types";

export function NavGroup({
  title,
  items,
  activeSection,
  activeTab,
  onActivate,
}: {
  title: string;
  items: NavItem[];
  activeSection: SectionKey;
  activeTab: OverviewTab;
  onActivate: (item: NavItem) => void;
}) {
  return (
    <div className="nav-group">
      <p className="nav-title">{title}</p>
      {items.map((item) => {
        const active = item.section === activeSection && (!item.tab || item.tab === activeTab);
        return (
          <button className={`nav-item ${active ? "active" : ""}`} key={`${item.section}-${item.label}`} onClick={() => onActivate(item)}>
            <span>{item.label}</span>
            {item.tag && <span className="tag">{item.tag}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Metric({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </div>
  );
}

export function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" value={value} type={type} step={step} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field full">
      <div className="field-row">
        <label className="label">{label}</label>
        <span className="counter">{value.length}</span>
      </div>
      <textarea className="textarea" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

export function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="panel">
      <div className="panel-header"><h3 className="panel-title">{title}</h3></div>
      <div className="settings-status warn" style={{ marginTop: 16 }}>{message}</div>
    </div>
  );
}

export function StringListPanel({
  title,
  values,
  onChange,
}: {
  title: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-header"><h3 className="panel-title">{title}</h3></div>
      <div className="list-editor">
        <div className="editable-list">
          {values.map((item, index) => (
            <div className="editable-item" key={`${title}-${index}`}>
              <div className="index">{index + 1}.</div>
              <input
                className="input"
                value={item}
                onChange={(event) => onChange(updateAt(values, index, event.target.value))}
              />
              <button className="icon-btn" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>×</button>
            </div>
          ))}
        </div>
        <div className="toolbar">
          <button className="btn btn-light" onClick={() => onChange([...values, ""])}>新增一条</button>
        </div>
      </div>
    </div>
  );
}

export function EditableQaTable({
  items,
  onChange,
}: {
  items: QaItem[];
  onChange: (items: QaItem[]) => void;
}) {
  return (
    <table className="qa-table">
      <thead><tr><th>问题</th><th>答案</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id || index}>
            <td><input className="input" value={item.question} onChange={(event) => onChange(updateAt(items, index, { ...item, question: event.target.value }))} /></td>
            <td><textarea className="textarea" value={item.answer} onChange={(event) => onChange(updateAt(items, index, { ...item, answer: event.target.value }))} /></td>
            <td>
              <select className="select" value={item.status} onChange={(event) => onChange(updateAt(items, index, { ...item, status: event.target.value as QaItem["status"] }))}>
                <option value="enabled">启用中</option>
                <option value="pending">待审核</option>
                <option value="disabled">已停用</option>
              </select>
            </td>
            <td><button className="icon-btn" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeviceRecordTable({
  items,
  deleting,
  onDelete,
}: {
  items: DeviceBinding[];
  deleting: boolean;
  onDelete: (deviceCode: string) => void;
}) {
  return (
    <table className="qa-table">
      <thead><tr><th>设备编码</th><th>设备名称</th><th>状态</th><th>版本</th><th>最近同步</th><th>操作</th></tr></thead>
      <tbody>
        {items.length ? items.map((item) => (
          <tr key={item.id}>
            <td>{item.deviceCode}</td>
            <td>{item.deviceName}</td>
            <td><span className={`status-pill ${item.bindStatus === "active" ? "status-ready" : "status-wait"}`}>{item.bindStatus === "active" ? "已激活" : "停用"}</span></td>
            <td>{item.appVersion || "-"}</td>
            <td>{formatDate(item.lastSyncAt)}</td>
            <td>
              <button className="btn btn-light" disabled={deleting} onClick={() => onDelete(item.deviceCode)}>
                {deleting ? "处理中..." : "删除并重激活"}
              </button>
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan={6} className="table-empty">当前还没有设备同步记录。</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function QaTable({ rows }: { rows: string[][] }) {
  return (
    <table className="qa-table">
      <thead><tr><th>问题/版本</th><th>答案/说明</th><th>状态</th></tr></thead>
      <tbody>
        {rows.length ? rows.map((row) => (
          <tr key={row.join("-")}><td>{row[0]}</td><td>{row[1]}</td><td><span className={`status-pill ${row[2].includes("待") || row[2].includes("回滚") || row[2].includes("优化") ? "status-wait" : "status-ready"}`}>{row[2]}</span></td></tr>
        )) : (
          <tr>
            <td colSpan={3} className="table-empty">当前暂无记录。</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function RulesPanel() {
  return (
    <div className="panel">
      <div className="panel-header"><h3 className="panel-title">规则说明</h3></div>
      <MiniCards items={["固定问答优先级高于知识库。", "适合政务口径、办事流程和安全提示。", "同义问法可合并为一个标准答案。"]} />
    </div>
  );
}

export function MiniCards({ items }: { items: string[] }) {
  return <div className="card-list">{items.map((item) => <div className="mini-card" key={item}><h4>配置项</h4><p>{item}</p></div>)}</div>;
}

export function Timeline({ items }: { items: string[] }) {
  return <div className="timeline">{items.map((item, index) => <div className="timeline-item" key={item}><strong>{index + 1}. 记录</strong><span>{item}</span></div>)}</div>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return <div className="toast">{message}</div>;
}

export async function apiGet<T>(url: string): Promise<T> {
  return unwrapApi<T>(await fetch(url));
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

export async function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "DELETE",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}

async function unwrapApi<T>(response: Response): Promise<T> {
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.ok) {
    throw new Error(!envelope.ok ? envelope.error.message : response.statusText);
  }
  return envelope.data;
}

export function setLoadingFlag(key: string, value: boolean, setLoading: Dispatch<SetStateAction<LoadingState>>) {
  setLoading((current) => ({ ...current, [key]: value }));
}

export function getIndexId(index: IndexItem) {
  return index.Id ?? index.id ?? "";
}

export function getIndexName(index: IndexItem) {
  return index.Name ?? index.name ?? "未命名知识库";
}

export function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function currentTimeText() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

export function buildSettingsForm(config: DigitalHumanConfig | null): SettingsFormState {
  return {
    dashscopeApiKey: config?.dashscopeApiKey ?? "",
    baseUrl: config?.baseUrl ?? "https://dashscope.aliyuncs.com",
    llmModel: config?.llmModel ?? "qwen-plus",
    asrModel: config?.asrModel ?? "qwen3-asr-flash-realtime",
    ttsModel: config?.ttsModel ?? "cosyvoice-v3-flash",
    ttsVoice: config?.ttsVoice ?? "longanyang",
    systemPrompt: config?.systemPrompt ?? "",
    prefixPrompt: config?.prefixPrompt ?? "",
    openingMessage: config?.openingMessage ?? "",
    wakeWordEnabled: String(config?.wakeWordEnabled ?? true),
    wakeWordText: config?.wakeWordText ?? "",
    live2dModelPath: normalizeLive2dModelPath(config?.live2dModelPath ?? ""),
    weatherCity: config?.weatherCity ?? "",
    videoOrientation: config?.videoOrientation ?? "landscape",
    fontScale: String(config?.fontScale ?? 1),
    modelScale: String(config?.modelScale ?? 0.95),
    wakeWordHintOffsetDp: String(config?.wakeWordHintOffsetDp ?? 0),
    videoLoopMode: config?.videoLoopMode ?? "playlist",
    videoSingleUri: config?.videoSingleUri ?? "",
    videoItemsText: (config?.videoItems ?? []).map((item) => `${item.uri}|${item.displayName}`).join("\n"),
    frontCameraRotationDegrees: String(config?.frontCameraRotationDegrees ?? 0),
    frontCameraDiameterDp: String(config?.frontCameraDiameterDp ?? 0),
    activationCode: config?.activationCode ?? "",
    activatedFingerprint: config?.activatedFingerprint ?? "",
    activationUnlocked: String(config?.activationUnlocked ?? false),
    onboardingCompleted: String(config?.onboardingCompleted ?? true),
  };
}

export function buildInteractionForm(data: InteractionData | null): InteractionData {
  return {
    openingMessages: data?.openingMessages ?? [],
    wakeWords: data?.wakeWords ?? [],
    standbyCommands: data?.standbyCommands ?? [],
    interruptWords: data?.interruptWords ?? [],
    fallbackMessages: data?.fallbackMessages ?? [],
  };
}

export function buildCreateRoleForm(indices: IndexItem[], models: Live2dModelOption[]): CreateRoleFormState {
  return {
    id: null,
    name: "",
    code: `role-${Date.now()}`,
    sceneType: "",
    assistantName: "",
    status: "enabled",
    description: "",
    live2dModelPath: normalizeLive2dModelPath(models[0]?.modelPath ?? ""),
    systemPrompt: "",
    openingMessages: ["您好，我是数字人助手，请问有什么可以帮您？"],
    knowledgeBaseIndexId: indices[0] ? getIndexId(indices[0]) : "",
    wakeWords: ["阿喜警官"],
    interruptWords: ["暂停", "别说了"],
    selectedFixedQaIds: [ROLE_FIXED_QA_PRESETS[0]?.id].filter(Boolean) as string[],
  };
}

export function buildRoleForm(
  selectedHuman: DigitalHumanRecord | null,
  selectedConfigVersion: DigitalHumanConfigVersion | null,
  interactionData: InteractionData | null,
  fixedQaData: QaData | null,
  indices: IndexItem[],
  models: Live2dModelOption[],
): CreateRoleFormState {
  if (!selectedHuman) {
    return buildCreateRoleForm(indices, models);
  }

  const config = selectedConfigVersion?.config;
  const availableModelPaths = new Set(models.map((item) => item.modelPath));
  const normalizedStoredModelPath = normalizeLive2dModelPath(config?.live2dModelPath ?? "");
  const resolvedModelPath = availableModelPaths.has(normalizedStoredModelPath)
    ? normalizedStoredModelPath
    : (models[0]?.modelPath ?? "");
  const availableQaIds = new Set(mergeQaCatalog(fixedQaData?.items ?? []).map((item) => item.id));
  const storedQaIds = (config?.selectedFixedQaIds ?? []).filter((item) => availableQaIds.has(item));
  const fallbackQaIds = (fixedQaData?.items ?? []).map((item) => item.id).filter((item) => availableQaIds.has(item));
  return {
    id: selectedHuman.id,
    name: selectedHuman.name,
    code: selectedHuman.code,
    sceneType: selectedHuman.sceneType,
    assistantName: selectedHuman.assistantName,
    status: selectedHuman.status,
    description: selectedHuman.description,
    live2dModelPath: resolvedModelPath,
    systemPrompt: config?.systemPrompt ?? "",
    openingMessages: interactionData?.openingMessages?.length
      ? interactionData.openingMessages
      : splitLines(config?.openingMessage ?? ""),
    knowledgeBaseIndexId: config?.knowledgeBaseIndexId ?? (indices[0] ? getIndexId(indices[0]) : ""),
    wakeWords: interactionData?.wakeWords?.length
      ? interactionData.wakeWords
      : splitLines(config?.wakeWordText ?? ""),
    interruptWords: interactionData?.interruptWords ?? [],
    selectedFixedQaIds: storedQaIds.length ? storedQaIds : fallbackQaIds,
  };
}

export function buildConfigPayload(form: SettingsFormState): Partial<DigitalHumanConfig> {
  return {
    llmModel: form.llmModel.trim(),
    asrModel: form.asrModel.trim(),
    ttsModel: form.ttsModel.trim(),
    ttsVoice: form.ttsVoice.trim(),
    systemPrompt: form.systemPrompt.trim(),
    prefixPrompt: form.prefixPrompt.trim(),
    openingMessage: form.openingMessage.trim(),
    wakeWordEnabled: form.wakeWordEnabled === "true",
    wakeWordText: form.wakeWordText.trim(),
    live2dModelPath: normalizeLive2dModelPath(form.live2dModelPath),
    weatherCity: form.weatherCity.trim(),
    videoOrientation: form.videoOrientation === "portrait" ? "portrait" : "landscape",
    fontScale: parseNumber(form.fontScale, 1),
    modelScale: parseNumber(form.modelScale, 0.95),
    wakeWordHintOffsetDp: parseInteger(form.wakeWordHintOffsetDp, 0),
    videoLoopMode: form.videoLoopMode === "single" ? "single" : "playlist",
    videoSingleUri: form.videoSingleUri.trim(),
    videoItems: parseVideoItems(form.videoItemsText),
    frontCameraRotationDegrees: parseInteger(form.frontCameraRotationDegrees, 0),
    frontCameraDiameterDp: parseInteger(form.frontCameraDiameterDp, 0),
    activationCode: form.activationCode.trim(),
    activatedFingerprint: form.activatedFingerprint.trim(),
    activationUnlocked: form.activationUnlocked === "true",
    onboardingCompleted: form.onboardingCompleted === "true",
  };
}

export function parseVideoItems(text: string): VideoItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [uri, displayName] = line.split("|");
      return {
        uri: (uri ?? "").trim(),
        displayName: (displayName ?? "").trim(),
      };
    })
    .filter((item) => item.uri);
}

export function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function updateAt<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

export function emptyQaItem(): QaItem {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
    status: "enabled",
  };
}

export function hasQaContent(item: QaItem) {
  return item.question.trim() || item.answer.trim();
}

export function emptyHotwordGroup(): HotwordGroup {
  return {
    id: crypto.randomUUID(),
    name: "",
    words: [],
    type: "business",
    enabled: true,
  };
}

export function splitWords(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeQaCatalog(items: QaItem[]) {
  const map = new Map<string, QaItem>();
  [...ROLE_FIXED_QA_PRESETS, ...items].forEach((item) => {
    map.set(item.id, item);
  });
  return [...map.values()];
}

export function buildModelPreviewUrl(modelPath: string) {
  const normalizedPath = normalizeLive2dModelPath(modelPath);
  if (!normalizedPath) {
    return "/api/live2d/preview?preview=1";
  }
  return `/api/live2d/preview?preview=1&model=${encodeURIComponent(`/api/live2d/model-files/${normalizedPath}`)}`;
}

export function normalizeLive2dModelPath(modelPath: string) {
  const normalized = modelPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    return "";
  }

  const prefixes = [
    "api/live2d/model-files/",
    "assets/models/live2d_models/",
    "models/live2d_models/",
    "live2d_models/",
  ];

  const matchedPrefix = prefixes.find((prefix) => normalized.startsWith(prefix));
  return matchedPrefix ? normalized.slice(matchedPrefix.length) : normalized;
}

export function humanStatusText(status: DigitalHumanStatus) {
  switch (status) {
    case "enabled":
      return "已启用";
    case "disabled":
      return "已停用";
    case "archived":
      return "已归档";
    default:
      return "草稿";
  }
}

export function userRoleText(role: UserRole) {
  if (role === "super_admin") return "超级管理员";
  return role === "admin" ? "管理员" : "运营人员";
}

export function userStatusText(status: UserStatus) {
  return status === "enabled" ? "启用中" : "已停用";
}

export function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function formatNullableDate(value: string | null) {
  return value ? formatDate(value) : "-";
}
