"use client";

import { useEffect, useState } from "react";
import type { IndexItem } from "@/components/KnowledgeManagement";
import {
  apiPost,
  currentTimeText,
  getIndexId,
  getIndexName,
  readError,
  Timeline,
} from "@/components/dashboard/shared";

export function DebugMock({ selectedHumanId, selectedIndexId, indices }: { selectedHumanId: string; selectedIndexId: string; indices: IndexItem[] }) {
  const [query, setQuery] = useState("请问今天能办理身份证吗？");
  const [mode, setMode] = useState<"auto" | "fixed_qa" | "knowledge">("auto");
  const [debugIndexId, setDebugIndexId] = useState(selectedIndexId || "");
  const [running, setRunning] = useState(false);
  const [resultText, setResultText] = useState(
    `当前角色：${selectedHumanId || "未选择"}\n当前选中知识库：${selectedIndexId || "未选择"}\n命中链路：ASR 文本 > 意图识别 > 固定问答优先 > 知识库召回 > LLM 兜底 > TTS 播报`,
  );
  const [logs, setLogs] = useState<string[]>([
    "10:12:31 wake_word=阿喜警官",
    "10:12:33 intent=身份证办理",
    "10:12:34 route=knowledge_base_retrieve",
  ]);

  useEffect(() => {
    if (selectedIndexId) {
      setDebugIndexId(selectedIndexId);
    }
  }, [selectedIndexId]);

  async function handleSimulate() {
    const trimmed = query.trim();
    if (!trimmed) {
      setResultText("请输入要测试的问题。");
      return;
    }
    if (!selectedHumanId) {
      setResultText("请先选择一个数字人角色。");
      return;
    }

    const startLog = `${currentTimeText()} query=${trimmed}`;
    setRunning(true);
    try {
      const result = await apiPost<{
        success: boolean;
        hit: {
          type: string;
          id?: string;
          title?: string;
          text?: string;
          score?: number;
          strategy?: string;
          matchedQuestion?: string;
          sourceTitle?: string;
          nodes?: Array<Record<string, unknown>>;
        };
        reply: string;
      }>("/api/admin/chat", {
        digitalHumanId: selectedHumanId,
        query: trimmed,
        mode,
      });
      const hit = result.hit;
      setResultText(
        [
          `当前模式：${mode === "auto" ? "自动路由" : mode === "fixed_qa" ? "固定问答优先" : "知识库召回调试"}`,
          `当前角色：${selectedHumanId}`,
          `测试问题：${trimmed}`,
          `命中类型：${hit.type}`,
          `命中标题：${hit.title || "-"}`,
          `命中问题：${hit.matchedQuestion || "-"}`,
          `知识来源：${hit.sourceTitle || "-"}`,
          `命中策略：${hit.strategy || "-"}`,
          `命中分数：${typeof hit.score === "number" ? hit.score.toFixed(3) : "-"}`,
          `回复内容：${result.reply}`,
        ].join("\n"),
      );
      const newLogs: string[] = [];
      newLogs.push(`${currentTimeText()} route=${hit.type} strategy=${hit.strategy || "-"}`);
      if (typeof hit.score === "number") {
        newLogs.push(`${currentTimeText()} score=${hit.score.toFixed(3)}`);
      }
      if (hit.nodes) {
        newLogs.push(`${currentTimeText()} nodes=${hit.nodes.length}`);
      }
      newLogs.push(startLog);
      setLogs((current) => [...newLogs, ...current].slice(0, 12));
    } catch (error) {
      const message = readError(error);
      setResultText(`模拟失败：${message}`);
      setLogs((current) => [
        `${currentTimeText()} error=${message}`,
        startLog,
        ...current,
      ].slice(0, 12));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="split">
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">联调测试台</h3>
          <button className="btn btn-primary" onClick={() => void handleSimulate()} disabled={running}>
            {running ? "模拟中..." : "开始模拟"}
          </button>
        </div>
        <div className="test-box">
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="select" value={mode} onChange={(event) => setMode(event.target.value as "auto" | "fixed_qa" | "knowledge")}>
            <option value="auto">自动路由（完整链路）</option>
            <option value="fixed_qa">固定问答优先</option>
            <option value="knowledge">知识库召回调试</option>
          </select>
          {mode === "knowledge" && (
            <select className="select" value={debugIndexId} onChange={(event) => setDebugIndexId(event.target.value)}>
              <option value="">{debugIndexId ? "请选择知识库索引" : "未选择知识库索引"}</option>
              {indices.map((item) => {
                const id = getIndexId(item);
                return <option key={id} value={id}>{getIndexName(item)}</option>;
              })}
            </select>
          )}
          <div className="test-result">{resultText}</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h3 className="panel-title">调试日志</h3></div>
        <Timeline items={logs} />
      </div>
    </div>
  );
}
