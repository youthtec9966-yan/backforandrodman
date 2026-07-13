"use client";

import SparkMD5 from "spark-md5";
import { useMemo, useState } from "react";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

export type ConfigStatus = {
  ready: boolean;
  endpoint: string;
  workspaceIdMasked: string | null;
  missing: string[];
};

export type IndexItem = {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
  Description?: string;
  description?: string;
  DocumentIds?: string[];
  documentIds?: string[];
  SourceType?: string;
  sourceType?: string;
  SinkType?: string;
  sinkType?: string;
  EmbeddingModelName?: string;
  embeddingModelName?: string;
  ChunkSize?: number;
  chunkSize?: number;
  [key: string]: unknown;
};

export type IndexDocument = {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
  DocumentType?: string;
  documentType?: string;
  GmtModified?: number;
  gmtModified?: number;
  Size?: number;
  size?: number;
  Status?: string;
  status?: string;
  Message?: string;
  message?: string;
  SourceId?: string;
  sourceId?: string;
};

export type TaskRecord = {
  id: string;
  kind: "create-index" | "add-documents";
  status: "running" | "completed" | "failed";
  stage: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  requestId: string | null;
  indexId: string | null;
  fileId: string | null;
  jobId: string | null;
  updatedAt: string;
  createdAt: string;
};

export const MANAGED_INDEX_ID = "8yqfn8620x";
export const MANAGED_INDEX_NAME = "石拐公安";

const stageLabel: Record<string, string> = {
  waiting_file_parse: "等待文件解析",
  creating_index: "创建知识库",
  submitting_index_job: "提交索引任务",
  submitting_add_documents_job: "提交追加任务",
  waiting_index_job: "等待索引完成",
  deleting_old_document: "删除旧文件",
  completed: "已完成",
  failed: "失败",
};

type KnowledgeManagementProps = {
  config: ConfigStatus | null;
  indices: IndexItem[];
  documents: IndexDocument[];
  tasks: TaskRecord[];
  loading: Record<string, boolean>;
  setNotice: (message: string) => void;
  reloadDocuments: () => Promise<void>;
  reloadTasks: () => Promise<void>;
};

export function KnowledgeManagement({
  config,
  indices,
  documents,
  tasks,
  loading,
  setNotice,
  reloadDocuments,
  reloadTasks,
}: KnowledgeManagementProps) {
  const [query, setQuery] = useState("身份证办理在哪里？");
  const [retrieveResult, setRetrieveResult] = useState<any>(null);
  const managedIndex = useMemo(
    () => indices.find((index) => getIndexId(index) === MANAGED_INDEX_ID),
    [indices],
  );

  async function deleteDocument(documentId: string) {
    if (!window.confirm(`确认从 ${MANAGED_INDEX_NAME} 知识库删除文件 ${documentId}？`)) return;
    try {
      await apiDelete(`/api/indices/${MANAGED_INDEX_ID}/documents/${encodeURIComponent(documentId)}`);
      setNotice("文件删除请求已完成");
      await reloadDocuments();
    } catch (error) {
      setNotice(readError(error));
    }
  }

  async function retrieveKb() {
    if (!query.trim()) return;
    try {
      setRetrieveResult(await apiPost("/api/retrieve", { indexId: MANAGED_INDEX_ID, query }));
    } catch (error) {
      setNotice(readError(error));
    }
  }

  return (
    <div className="kb-layout">
      <section className="metrics">
        <Metric label="后端配置" value={config?.ready ? "已连接" : "待配置"} foot={config?.workspaceIdMasked ?? config?.endpoint ?? "读取中"} />
        <Metric label="当前知识库" value={MANAGED_INDEX_NAME} foot={MANAGED_INDEX_ID} />
        <Metric label="文件数量" value={String(documents.length)} foot="来自 ListIndexDocuments 实时查询" />
        <Metric label="运行中任务" value={String(tasks.filter((task) => task.status === "running").length)} foot="解析与索引每 5 秒轮询" />
      </section>

      <div className="split">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">知识库文件管理</h3>
            <div className="toolbar">
              <span className="hint">
                {managedIndex ? getIndexName(managedIndex) : MANAGED_INDEX_NAME} / {MANAGED_INDEX_ID}
              </span>
              <button className="btn btn-light" onClick={reloadDocuments} disabled={loading.documents}>
                {loading.documents ? "刷新中" : "刷新文件"}
              </button>
              <button className="btn btn-primary" onClick={() => document.getElementById("kbUploadInput")?.click()}>
                上传文档
              </button>
            </div>
          </div>
          <div className="kb-table-scroll">
            <table className="knowledge-list">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>类型/大小</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">当前知识库暂无文件，或文件列表暂未返回。可以先上传文档追加到 {MANAGED_INDEX_ID}。</div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const id = getDocumentId(doc);
                    const status = getDocumentStatus(doc);
                    return (
                      <tr key={id}>
                        <td className="kb-name-cell">
                          <strong>{getDocumentName(doc)}</strong>
                          <div className="kb-muted">{id}</div>
                        </td>
                        <td>
                          {getDocumentType(doc)}
                          <div className="kb-muted">{formatFileSize(getDocumentSize(doc))}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${documentStatusClass(status)}`}>{documentStatusLabel(status)}</span>
                          {(doc.Message ?? doc.message) && <div className="kb-muted">{String(doc.Message ?? doc.message)}</div>}
                        </td>
                        <td>{formatTimestamp(doc.GmtModified ?? doc.gmtModified)}</td>
                        <td>
                          <div className="toolbar">
                            <button className="btn btn-danger" onClick={() => void deleteDocument(id)} disabled={!id}>
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-list">
          <UploadCard onTaskCreated={reloadTasks} onDocumentsChanged={reloadDocuments} onNotice={setNotice} />
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">召回配置</h3>
            </div>
            <div className="card-list">
              <div className="mini-card">
                <h4>召回优先级</h4>
                <p>固定问答 &gt; 知识库 &gt; 大模型兜底，支持按场景定制不同优先级。</p>
              </div>
              <div className="mini-card">
                <h4>切片策略</h4>
                <p>当前由百炼知识库配置决定，本页面展示实际知识库、文件与检索结果。</p>
              </div>
              <div className="mini-card">
                <h4>连接状态</h4>
                <p>{config?.ready ? `服务端已读取 ${config.workspaceIdMasked} / ${config.endpoint}` : `缺少配置：${config?.missing.join("、") || "读取中"}`}</p>
              </div>
              <div className="mini-card">
                <h4>管理范围</h4>
                <p>当前页面已硬编码为只管理“{MANAGED_INDEX_NAME} {MANAGED_INDEX_ID}”知识库，文件追加也固定提交到该知识库。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">检索调试</h3>
            <span className="hint">{MANAGED_INDEX_NAME} / {MANAGED_INDEX_ID}</span>
          </div>
          <div className="test-box">
            <input className="input" value={`${MANAGED_INDEX_NAME} / ${MANAGED_INDEX_ID}`} readOnly />
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="toolbar">
              <button className="btn btn-primary" onClick={() => void retrieveKb()} disabled={!query.trim()}>
                模拟测试
              </button>
              <button className="btn btn-light" onClick={() => setRetrieveResult(null)}>
                清空结果
              </button>
            </div>
            <RetrieveResult result={retrieveResult} />
          </div>
        </div>

        <TaskPanel tasks={tasks} reloadTasks={reloadTasks} />
      </div>
    </div>
  );
}

function UploadCard({
  onTaskCreated,
  onDocumentsChanged,
  onNotice,
}: {
  onTaskCreated: () => Promise<void>;
  onDocumentsChanged: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [oldFileId, setOldFileId] = useState("");
  const [step, setStep] = useState("待上传");
  const [working, setWorking] = useState(false);

  async function submit() {
    if (!file) return;

    setWorking(true);
    try {
      setStep("计算 MD5");
      const md5 = await calculateMd5(file);
      setStep("申请上传租约");
      const lease: any = await apiPost("/api/files/lease", {
        fileName: file.name,
        md5,
        sizeInBytes: String(file.size),
        categoryId: "default",
      });

      setStep("浏览器直传百炼");
      await uploadToLease(lease.url, lease.headers, file);
      setStep("提交文件");
      const commit: any = await apiPost("/api/files/commit", {
        leaseId: lease.leaseId,
        categoryId: lease.categoryId ?? "default",
      });

      setStep("创建任务");
      await apiPost("/api/tasks/add-documents", {
        indexId: MANAGED_INDEX_ID,
        fileId: commit.fileId,
        oldFileId: oldFileId.trim() || undefined,
      });

      setStep("任务已创建");
      setFile(null);
      setOldFileId("");
      await onTaskCreated();
      await onDocumentsChanged();
      onNotice("文件已提交，任务中心会继续跟踪解析和索引状态");
    } catch (error) {
      setStep("失败");
      onNotice(readError(error));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">上传文档</h3>
        <span className="hint">{step}</span>
      </div>
      <div className="card-list">
        <div className="mini-card">
          <h4>追加目标</h4>
          <p>{MANAGED_INDEX_NAME} / {MANAGED_INDEX_ID}</p>
        </div>
        <input
          id="kbUploadInput"
          className="input"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <input
          className="input"
          placeholder="旧文件 ID，可选；填写后索引完成会删除旧文件"
          value={oldFileId}
          onChange={(event) => setOldFileId(event.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={working || !file}
        >
          {working ? "处理中..." : "上传并追加文件"}
        </button>
      </div>
    </div>
  );
}

function RetrieveResult({ result }: { result: any }) {
  if (!result) {
    return <div className="test-result">命中链路和召回结果将在这里展示。</div>;
  }

  const nodes = result.nodes ?? [];
  return (
    <div className="test-result">
      <strong>RequestId：{result.requestId ?? "-"}</strong>
      <br />
      <strong>召回数量：{nodes.length}</strong>
      <div className="timeline" style={{ marginTop: 12 }}>
        {nodes.map((node: any, index: number) => (
          <div className="timeline-item" key={index}>
            <strong>
              {index + 1}. {node.metadata?.doc_name ?? node.Metadata?.doc_name ?? "未知来源"} / score {formatScore(node.score ?? node.Score)}
            </strong>
            <span>{node.text ?? node.Text ?? ""}</span>
          </div>
        ))}
      </div>
      <details style={{ marginTop: 12 }}>
        <summary>原始响应</summary>
        <pre>{JSON.stringify(result.raw, null, 2)}</pre>
      </details>
    </div>
  );
}

function TaskPanel({ tasks, reloadTasks }: { tasks: TaskRecord[]; reloadTasks: () => Promise<void> }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">知识库更新记录</h3>
        <button className="btn btn-light" onClick={reloadTasks}>
          刷新任务
        </button>
      </div>
      <div className="timeline">
        {tasks.length === 0 ? (
          <div className="empty">暂无任务记录</div>
        ) : (
          tasks.map((task) => (
            <div className="timeline-item" key={task.id}>
              <strong>
                {task.kind === "create-index" ? "创建知识库" : "追加文件"} · {stageLabel[task.stage] ?? task.stage}
              </strong>
              <span>
                状态：{task.status}　更新时间：{formatTime(task.updatedAt)}
                {task.indexId ? `　IndexId：${task.indexId}` : ""}
                {task.fileId ? `　FileId：${task.fileId}` : ""}
                {task.jobId ? `　JobId：${task.jobId}` : ""}
                {task.error ? `　错误：${task.error}` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </div>
  );
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  return unwrapApi<T>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function apiDelete<T>(url: string): Promise<T> {
  return unwrapApi<T>(await fetch(url, { method: "DELETE" }));
}

async function unwrapApi<T>(response: Response): Promise<T> {
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.ok) {
    throw new Error(!envelope.ok ? envelope.error.message : response.statusText);
  }
  return envelope.data;
}

async function calculateMd5(file: File) {
  const chunkSize = 2 * 1024 * 1024;
  const spark = new SparkMD5.ArrayBuffer();
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    spark.append(await chunk.arrayBuffer());
    offset += chunkSize;
  }

  return spark.end();
}

async function uploadToLease(url: string, headers: Record<string, string>, file: File) {
  const uploadHeaders = new Headers();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value) uploadHeaders.set(key, value);
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: uploadHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`直传失败：HTTP ${response.status}`);
  }
}

function getIndexId(index: IndexItem) {
  return index.Id ?? index.id ?? "";
}

function getIndexName(index: IndexItem) {
  return index.Name ?? index.name ?? "未命名知识库";
}

function getDocumentId(document: IndexDocument) {
  return document.Id ?? document.id ?? "";
}

function getDocumentName(document: IndexDocument) {
  return document.Name ?? document.name ?? "未命名文件";
}

function getDocumentType(document: IndexDocument) {
  return document.DocumentType ?? document.documentType ?? "-";
}

function getDocumentSize(document: IndexDocument) {
  return document.Size ?? document.size ?? 0;
}

function getDocumentStatus(document: IndexDocument) {
  return document.Status ?? document.status ?? "";
}

function documentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    FINISH: "已生效",
    RUNNING: "导入中",
    INSERT_ERROR: "导入失败",
    DELETED: "已删除",
  };

  return labels[status] ?? (status || "未知");
}

function documentStatusClass(status: string) {
  if (status === "FINISH") return "status-ready";
  if (status === "INSERT_ERROR" || status === "DELETED") return "status-danger";
  return "status-wait";
}

function formatFileSize(value: number) {
  if (!value) return "-";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatTimestamp(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatScore(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : "-";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
