"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildConfigPayload,
  buildInteractionForm,
  buildSettingsForm,
  EditableQaTable,
  EmptyPanel,
  emptyHotwordGroup,
  emptyQaItem,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  hasQaContent,
  Metric,
  RulesPanel,
  StringListPanel,
  updateAt,
  splitWords,
} from "@/components/dashboard/shared";
import type {
  DigitalHumanConfig,
  DigitalHumanConfigVersion,
  DigitalHumanRecord,
  HotwordData,
  HotwordGroup,
  InteractionData,
  LoadingState,
  OverviewTab,
  QaData,
  QaItem,
  SettingsFormState,
} from "@/components/dashboard/types";

export function OverviewTabs({
  activeTab,
  onChange,
  selectedHuman,
  selectedConfigVersion,
  saveLoading,
  onSaveConfig,
  onRefreshSelected,
  interactionData,
  fixedQaData,
  faqData,
  hotwordData,
  onSaveInteraction,
  onSaveQa,
  onSaveFaq,
  onSaveHotwords,
  opsLoading,
}: {
  activeTab: OverviewTab;
  onChange: (tab: OverviewTab) => void;
  selectedHuman: DigitalHumanRecord | null;
  selectedConfigVersion: DigitalHumanConfigVersion | null;
  saveLoading: boolean;
  onSaveConfig: (payload: Partial<DigitalHumanConfig>) => Promise<void>;
  onRefreshSelected: () => void;
  interactionData: InteractionData | null;
  fixedQaData: QaData | null;
  faqData: QaData | null;
  hotwordData: HotwordData | null;
  onSaveInteraction: (payload: InteractionData) => Promise<void>;
  onSaveQa: (payload: QaData) => Promise<void>;
  onSaveFaq: (payload: QaData) => Promise<void>;
  onSaveHotwords: (payload: HotwordData) => Promise<void>;
  opsLoading: LoadingState;
}) {
  const tabs: Array<[OverviewTab, string]> = [
    ["settings", "数字人设置"],
    ["interaction", "交互设置"],
    ["qa", "固定问答"],
    ["faq", "常见问题"],
    ["hotword", "热词"],
  ];

  return (
    <>
      <section className="metrics">
        <Metric label="已启用知识库" value="3" foot="最近 24 小时更新 1 次" />
        <Metric label="固定问答条数" value="128" foot="命中率较上周提升 12%" />
        <Metric label="唤醒词别名" value="4" foot="含正式词、谐音词、简称" />
        <Metric label="未命中兜底率" value="8%" foot="建议持续补充 FAQ 与知识库" />
      </section>

      <div className="page-tabs">
        {tabs.map(([key, label]) => (
          <button className={`page-tab ${activeTab === key ? "active" : ""}`} key={key} onClick={() => onChange(key)}>
            {label}
          </button>
        ))}
      </div>

      <section className={`view grid-1 ${activeTab === "settings" ? "active" : ""}`}>
        <SettingsPanel
          selectedHuman={selectedHuman}
          selectedConfigVersion={selectedConfigVersion}
          saveLoading={saveLoading}
          onSave={onSaveConfig}
          onReload={onRefreshSelected}
        />
      </section>
      <section className={`view grid-2 ${activeTab === "interaction" ? "active" : ""}`}>
        <InteractionPanel
          selectedHuman={selectedHuman}
          data={interactionData}
          saving={Boolean(opsLoading.saveInteraction)}
          onSave={onSaveInteraction}
        />
      </section>
      <section className={`view grid-1 ${activeTab === "qa" ? "active" : ""}`}>
        <QaPanel
          title="固定问答"
          description="维护高优先级标准答案，适合政务口径和固定流程类问题。"
          data={fixedQaData}
          saving={Boolean(opsLoading.saveQa)}
          onSave={onSaveQa}
        />
      </section>
      <section className={`view grid-1 ${activeTab === "faq" ? "active" : ""}`}>
        <QaPanel
          title="常见问题库"
          description="管理高频 FAQ、统一问法和运营优化建议。"
          data={faqData}
          saving={Boolean(opsLoading.saveFaq)}
          onSave={onSaveFaq}
        />
      </section>
      <section className={`view grid-1 ${activeTab === "hotword" ? "active" : ""}`}>
        <HotwordPanel
          data={hotwordData}
          saving={Boolean(opsLoading.saveHotwords)}
          onSave={onSaveHotwords}
        />
      </section>
    </>
  );
}

function SettingsPanel({
  selectedHuman,
  selectedConfigVersion,
  saveLoading,
  onSave,
  onReload,
}: {
  selectedHuman: DigitalHumanRecord | null;
  selectedConfigVersion: DigitalHumanConfigVersion | null;
  saveLoading: boolean;
  onSave: (payload: Partial<DigitalHumanConfig>) => Promise<void>;
  onReload: () => void;
}) {
  const [form, setForm] = useState<SettingsFormState>(() => buildSettingsForm(selectedConfigVersion?.config ?? null));

  useEffect(() => {
    setForm(buildSettingsForm(selectedConfigVersion?.config ?? null));
  }, [selectedConfigVersion?.id, selectedHuman?.id]);

  const setField = useCallback(<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const exportJson = useCallback(async () => {
    const text = JSON.stringify(buildConfigPayload(form), null, 2);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  }, [form]);

  if (!selectedHuman) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">数字人设置表单</h3>
        </div>
        <div className="settings-status warn" style={{ marginTop: 16 }}>当前没有选中的数字人实例，请先到“角色实例”里选择一条记录。</div>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="settings-actions">
          <div>
            <h3 className="panel-title">数字人设置表单</h3>
            <div className="hint">
              当前实例：{selectedHuman.name}，配置版本：
              {selectedConfigVersion ? ` V${selectedConfigVersion.versionNo}` : " 未创建"}
            </div>
          </div>
          <div className="toolbar">
            <button className="btn btn-light" onClick={onReload}>重新加载</button>
            <button className="btn btn-light" onClick={() => setForm(buildSettingsForm(selectedConfigVersion?.config ?? null))}>恢复当前版本</button>
            <button className="btn btn-light" onClick={() => void exportJson()}>导出 JSON</button>
            <button className="btn btn-primary" onClick={() => void onSave(buildConfigPayload(form))} disabled={saveLoading}>
              {saveLoading ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
        <div className="settings-status warn" style={{ marginTop: 16 }}>
          当前已接入真实 API，点击“保存设置”后会写入 SQLite，并生成新的配置版本。
        </div>
      </div>
      <div className="split">
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">模型与接入配置</h3></div>
          <div className="settings-status" style={{ marginBottom: 16 }}>
            DashScope Key 与服务地址已统一迁移到超级管理员控制台，这里只保留模型与语音模型等业务配置。
          </div>
          <div className="form-grid">
            <FieldInput label="LLM 模型" value={form.llmModel} onChange={(value) => setField("llmModel", value)} />
            <FieldInput label="ASR 模型" value={form.asrModel} onChange={(value) => setField("asrModel", value)} />
            <FieldInput label="TTS 模型" value={form.ttsModel} onChange={(value) => setField("ttsModel", value)} />
            <FieldInput label="TTS 音色" value={form.ttsVoice} onChange={(value) => setField("ttsVoice", value)} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">对话内容配置</h3></div>
          <div className="form-grid">
            <FieldTextarea label="系统提示词" value={form.systemPrompt} onChange={(value) => setField("systemPrompt", value)} />
            <FieldTextarea label="前置提示词" value={form.prefixPrompt} onChange={(value) => setField("prefixPrompt", value)} />
            <FieldTextarea label="开场白" value={form.openingMessage} onChange={(value) => setField("openingMessage", value)} />
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">设备端本地参数说明</h3>
        </div>
        <div className="mini-card">
          <h4>以下参数已改为 App 端本地设置</h4>
          <p>唤醒功能、主唤醒词、Live2D 模型、提示框偏移、天气城市、视频方向、字体缩放、数字人大小、视频循环模式、单视频地址、视频素材列表、前摄参数、激活码、设备指纹、激活状态和首次引导完成等内容由设备 App 自行维护，不再通过管理端远程设置。</p>
        </div>
      </div>
    </>
  );
}

function InteractionPanel({
  selectedHuman,
  data,
  saving,
  onSave,
}: {
  selectedHuman: DigitalHumanRecord | null;
  data: InteractionData | null;
  saving: boolean;
  onSave: (payload: InteractionData) => Promise<void>;
}) {
  const [form, setForm] = useState<InteractionData>(buildInteractionForm(data));

  useEffect(() => {
    setForm(buildInteractionForm(data));
  }, [data]);

  if (!selectedHuman) {
    return <EmptyPanel title="交互设置" message="请先选择一个数字人实例。" />;
  }

  return (
    <>
      <StringListPanel title="开场白" values={form.openingMessages} onChange={(values) => setForm((current) => ({ ...current, openingMessages: values }))} />
      <StringListPanel title="唤醒词" values={form.wakeWords} onChange={(values) => setForm((current) => ({ ...current, wakeWords: values }))} />
      <StringListPanel title="待机指令" values={form.standbyCommands} onChange={(values) => setForm((current) => ({ ...current, standbyCommands: values }))} />
      <StringListPanel title="打断词" values={form.interruptWords} onChange={(values) => setForm((current) => ({ ...current, interruptWords: values }))} />
      <div style={{ gridColumn: "1 / -1" }}>
        <StringListPanel title="兜底话术" values={form.fallbackMessages} onChange={(values) => setForm((current) => ({ ...current, fallbackMessages: values }))} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="toolbar">
          <button className="btn btn-primary" disabled={saving} onClick={() => void onSave(form)}>
            {saving ? "保存中..." : "保存交互设置"}
          </button>
        </div>
      </div>
    </>
  );
}

function QaPanel({
  title,
  description,
  data,
  saving,
  onSave,
}: {
  title: string;
  description: string;
  data: QaData | null;
  saving: boolean;
  onSave: (payload: QaData) => Promise<void>;
}) {
  const [items, setItems] = useState<QaItem[]>(data?.items ?? []);

  useEffect(() => {
    setItems(data?.items ?? []);
  }, [data]);

  return (
    <div className="split">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{title}</h3>
            <div className="hint">{description}</div>
          </div>
          <div className="toolbar">
            <button className="btn btn-light" onClick={() => setItems((current) => [...current, emptyQaItem()])}>新增</button>
            <button className="btn btn-primary" disabled={saving} onClick={() => void onSave({ items: items.filter(hasQaContent) })}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        <EditableQaTable items={items} onChange={setItems} />
      </div>
      <RulesPanel />
    </div>
  );
}

function HotwordPanel({
  data,
  saving,
  onSave,
}: {
  data: HotwordData | null;
  saving: boolean;
  onSave: (payload: HotwordData) => Promise<void>;
}) {
  const [groups, setGroups] = useState<HotwordGroup[]>(data?.groups ?? []);

  useEffect(() => {
    setGroups(data?.groups ?? []);
  }, [data]);

  return (
    <div className="split">
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">热词管理</h3>
          <div className="toolbar">
            <button className="btn btn-light" onClick={() => setGroups((current) => [...current, emptyHotwordGroup()])}>新增热词组</button>
            <button className="btn btn-primary" disabled={saving} onClick={() => void onSave({ groups: groups.filter((group) => group.name.trim()) })}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        <div className="card-list">
          {groups.map((group, index) => (
            <div className="mini-card" key={group.id || `${group.name}-${index}`}>
              <div className="toolbar">
                <strong>热词组 {index + 1}</strong>
                <button className="icon-btn" onClick={() => setGroups((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <FieldInput label="组名" value={group.name} onChange={(value) => setGroups((current) => updateAt(current, index, { ...group, name: value }))} />
                <FieldSelect
                  label="类型"
                  value={group.type}
                  onChange={(value) => setGroups((current) => updateAt(current, index, { ...group, type: value as HotwordGroup["type"] }))}
                  options={[["business", "业务词"], ["campaign", "活动词"], ["sensitive", "敏感词"]]}
                />
                <FieldSelect
                  label="状态"
                  value={String(group.enabled)}
                  onChange={(value) => setGroups((current) => updateAt(current, index, { ...group, enabled: value === "true" }))}
                  options={[["true", "启用"], ["false", "停用"]]}
                />
                <FieldTextarea
                  label="热词列表"
                  value={group.words.join("、")}
                  onChange={(value) => setGroups((current) => updateAt(current, index, { ...group, words: splitWords(value) }))}
                  placeholder="可用中文顿号、逗号或换行分隔"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><h3 className="panel-title">效果说明</h3></div>
        <div className="mini-card"><h4>识别增强</h4><p>热词会优先沉淀为业务词组，后续可以进一步接到 ASR 热词和意图识别增强能力。</p></div>
      </div>
    </div>
  );
}
