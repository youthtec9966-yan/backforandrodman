"use client";

import { useEffect, useState } from "react";
import type { IndexItem } from "@/components/KnowledgeManagement";
import {
  buildCreateRoleForm,
  buildModelPreviewUrl,
  buildRoleForm,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  getIndexId,
  getIndexName,
  humanStatusText,
  mergeQaCatalog,
  normalizeLive2dModelPath,
} from "@/components/dashboard/shared";
import type {
  CreateRoleFormState,
  DigitalHumanConfigVersion,
  DigitalHumanRecord,
  InteractionData,
  Live2dModelOption,
  QaData,
  QaItem,
} from "@/components/dashboard/types";

export function InstancesPanel({
  digitalHumans,
  live2dModels,
  loading,
  selectedHumanId,
  selectedHuman,
  selectedConfigVersion,
  interactionData,
  fixedQaData,
  indices,
  saving,
  deleting,
  onSelect,
  onRefresh,
  onSaveRole,
  onDeleteRole,
}: {
  digitalHumans: DigitalHumanRecord[];
  live2dModels: Live2dModelOption[];
  loading: boolean;
  selectedHumanId: string;
  selectedHuman: DigitalHumanRecord | null;
  selectedConfigVersion: DigitalHumanConfigVersion | null;
  interactionData: InteractionData | null;
  fixedQaData: QaData | null;
  indices: IndexItem[];
  saving: boolean;
  deleting: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onSaveRole: (payload: CreateRoleFormState) => Promise<void>;
  onDeleteRole: (role: DigitalHumanRecord) => Promise<void>;
}) {
  const [isRoleModalOpen, setRoleModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<CreateRoleFormState>(() => buildCreateRoleForm(indices, live2dModels));
  const fixedQaCatalog = mergeQaCatalog(fixedQaData?.items ?? []);
  const selectedRoleForm = buildRoleForm(selectedHuman, selectedConfigVersion, interactionData, fixedQaData, indices, live2dModels);
  const selectedModelPath = normalizeLive2dModelPath(selectedRoleForm.live2dModelPath);
  const currentModel = live2dModels.find((item) => item.modelPath === selectedModelPath) ?? null;
  const selectedQaItems = fixedQaCatalog.filter((item) => selectedRoleForm.selectedFixedQaIds.includes(item.id));
  const selectedQaCount = selectedQaItems.length;
  const roleStats = [
    { label: "角色总数", value: String(digitalHumans.length), note: "支持多角色配置与切换" },
    { label: "已选形象", value: currentModel?.name ?? "未选择", note: selectedModelPath || "当前角色尚未选择模型" },
    { label: "知识库绑定", value: selectedRoleForm.knowledgeBaseIndexId ? getIndexName(indices.find((item) => getIndexId(item) === selectedRoleForm.knowledgeBaseIndexId) ?? {}) : "未绑定", note: "角色可绑定专属知识库" },
    { label: "固定问答", value: `${selectedQaCount} 条`, note: "保存后同步写入角色绑定" },
  ];

  useEffect(() => {
    if (!selectedHumanId && digitalHumans[0]?.id) {
      onSelect(digitalHumans[0].id);
    }
  }, [digitalHumans, onSelect, selectedHumanId]);

  function openCreateRoleModal() {
    setModalForm(buildCreateRoleForm(indices, live2dModels));
    setRoleModalOpen(true);
  }

  function openEditRoleModal() {
    setModalForm(buildRoleForm(selectedHuman, selectedConfigVersion, interactionData, fixedQaData, indices, live2dModels));
    setRoleModalOpen(true);
  }

  async function handleSaveRole() {
    await onSaveRole(modalForm);
    setRoleModalOpen(false);
  }

  return (
    <>
      <div className="role-layout">
        <div className="panel role-sidebar">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">角色列表</h3>
              <div className="hint">页面只展示已有角色，新增和编辑都在弹窗里完成。</div>
            </div>
            <div className="toolbar role-sidebar-actions">
              <span className="hint">当前共 {digitalHumans.length} 条实例</span>
              <button className="btn btn-light" onClick={onRefresh}>刷新</button>
              <button className="btn btn-primary" onClick={openCreateRoleModal}>创建新角色</button>
            </div>
          </div>
          <div className="role-list">
            {digitalHumans.map((item) => {
              const selected = item.id === selectedHumanId;
              return (
                <button
                  className={`role-list-item ${selected ? "active" : ""}`}
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="role-list-head">
                    <strong>{item.name}</strong>
                    <span className={`status-pill ${item.status === "enabled" ? "status-ready" : "status-wait"}`}>{humanStatusText(item.status)}</span>
                  </div>
                  <div className="hint">{item.assistantName || "未设置助手名称"}</div>
                  <div className="role-list-meta">
                    <span>{item.code}</span>
                    <span>{item.currentVersionNo ? `V${item.currentVersionNo}` : "未发布"}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mini-card role-summary-card">
            <h4>当前说明</h4>
            <p>主页面只看已有角色详情，创建新角色或编辑角色时再打开弹窗填写完整内容。</p>
          </div>
        </div>
        <div className="role-main">
          <div className="role-stat-grid">
            {roleStats.map((item) => (
              <div className="stat-tile" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
          {selectedHuman ? (
            <>
              <div className="split role-hero">
                <div className="panel role-card-panel">
                  <div className="panel-header header-align-top role-section-header">
                    <div className="section-head-copy">
                      <h3 className="panel-title">Live2D 形象预览</h3>
                      <div className="hint">当前显示所选角色已保存的形象，点击编辑角色可在弹窗里修改。</div>
                    </div>
                    <span className="switch-tag">{currentModel?.name ?? "未选择模型"}</span>
                  </div>
                  <div className="role-card-body role-preview-body">
                    <div className="role-preview-stage role-preview-stage-card">
                      {selectedModelPath ? (
                        <iframe
                          title="角色预览"
                          src={buildModelPreviewUrl(selectedModelPath)}
                          className="preview-iframe preview-iframe-fill"
                        />
                      ) : (
                        <div className="empty role-preview-empty">当前角色还没有绑定 Live2D 形象。</div>
                      )}
                    </div>
                  </div>
                  <div className="settings-status role-preview-status">
                    当前模型：{selectedModelPath || "未选择"}。如需调整，请点击右侧“编辑角色”。
                  </div>
                </div>
                <div className="panel role-card-panel">
                  <div className="panel-header header-align-top role-section-header">
                    <div className="section-head-copy">
                      <h3 className="panel-title">角色基础信息</h3>
                      <div className="hint">这里展示当前角色已保存的人设、知识库与主要配置。</div>
                    </div>
                    <div className="toolbar">
                      <span className={`status-pill ${selectedHuman.status === "enabled" ? "status-ready" : "status-wait"}`}>{humanStatusText(selectedHuman.status)}</span>
                      <button className="btn btn-primary" onClick={openEditRoleModal}>编辑角色</button>
                      <button className="btn btn-danger" disabled={deleting} onClick={() => void onDeleteRole(selectedHuman)}>
                        {deleting ? "删除中..." : "删除角色"}
                      </button>
                    </div>
                  </div>
                  <div className="role-card-body role-info-body">
                    <div className="detail-grid">
                      <div className="detail-card">
                        <span>角色名称</span>
                        <strong>{selectedHuman.name}</strong>
                        <p>编码：{selectedHuman.code}</p>
                      </div>
                      <div className="detail-card">
                        <span>助手名称</span>
                        <strong>{selectedHuman.assistantName || "未设置"}</strong>
                        <p>场景：{selectedHuman.sceneType || "未设置"}</p>
                      </div>
                      <div className="detail-card">
                        <span>绑定知识库</span>
                        <strong>{selectedRoleForm.knowledgeBaseIndexId ? getIndexName(indices.find((item) => getIndexId(item) === selectedRoleForm.knowledgeBaseIndexId) ?? {}) : "暂不绑定"}</strong>
                        <p>版本：{selectedHuman.currentVersionNo ? `V${selectedHuman.currentVersionNo}` : "未发布"}</p>
                      </div>
                      <div className="detail-card">
                        <span>角色说明</span>
                        <strong>{selectedHuman.description || "未填写"}</strong>
                        <p>保存后同步更新角色基础信息</p>
                      </div>
                    </div>
                    <div className="detail-block">
                      <h4>系统提示词</h4>
                      <p>{selectedRoleForm.systemPrompt || "未填写系统提示词"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="split">
                <div className="panel role-card-panel">
                  <div className="panel-header role-section-header">
                    <div className="section-head-copy">
                      <h3 className="panel-title">开场白与唤醒配置</h3>
                      <div className="hint hint-placeholder">用于和右侧标题区保持对齐。</div>
                    </div>
                  </div>
                  <div className="role-card-body role-info-body">
                    <div className="detail-card-row">
                      <div className="detail-card">
                        <span>开场白</span>
                        <strong>{selectedRoleForm.openingMessages[0] || "未设置"}</strong>
                        <p>共 {selectedRoleForm.openingMessages.length} 条</p>
                      </div>
                      <div className="detail-card">
                        <span>唤醒词</span>
                        <strong>{selectedRoleForm.wakeWords[0] || "未设置"}</strong>
                        <p>共 {selectedRoleForm.wakeWords.length} 条</p>
                      </div>
                    </div>
                    <div className="detail-card-row detail-card-row-single">
                      <div className="detail-card">
                        <span>打断词</span>
                        <strong>{selectedRoleForm.interruptWords[0] || "未设置"}</strong>
                        <p>共 {selectedRoleForm.interruptWords.length} 条</p>
                      </div>
                    </div>
                    <div className="detail-block">
                      <h4>完整词库</h4>
                      <div className="tag-list">
                        {selectedRoleForm.openingMessages.map((item) => <span className="chip" key={`opening-${item}`}>{item}</span>)}
                        {selectedRoleForm.wakeWords.map((item) => <span className="chip" key={`wake-${item}`}>{item}</span>)}
                        {selectedRoleForm.interruptWords.map((item) => <span className="chip" key={`interrupt-${item}`}>{item}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="panel role-card-panel">
                  <div className="panel-header role-section-header">
                    <div className="section-head-copy">
                      <h3 className="panel-title">固定问答绑定</h3>
                      <div className="hint">展示当前角色已选择的标准问答。</div>
                    </div>
                  </div>
                  <div className="role-card-body role-info-body">
                    {selectedQaItems.length ? (
                      <div className="role-qa-grid">
                        {selectedQaItems.map((item) => (
                          <div className="qa-choice active" key={item.id}>
                            <div className="qa-choice-head">
                              <strong>{item.question}</strong>
                              <span className="status-pill status-ready">已绑定</span>
                            </div>
                            <p>{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">当前角色还没有绑定固定问答。</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel">
              <div className="panel-header"><h3 className="panel-title">角色详情</h3></div>
              <div className="empty">{loading ? "角色加载中..." : "当前还没有角色，请点击“创建新角色”开始配置。"}</div>
            </div>
          )}
        </div>
      </div>

      {isRoleModalOpen ? (
        <RoleFormModal
          form={modalForm}
          setForm={setModalForm}
          live2dModels={live2dModels}
          fixedQaCatalog={fixedQaCatalog}
          indices={indices}
          saving={saving}
          isEdit={Boolean(modalForm.id)}
          onClose={() => setRoleModalOpen(false)}
          onSave={handleSaveRole}
        />
      ) : null}
    </>
  );
}

function RoleFormModal({
  form,
  setForm,
  live2dModels,
  fixedQaCatalog,
  indices,
  saving,
  isEdit,
  onClose,
  onSave,
}: {
  form: CreateRoleFormState;
  setForm: React.Dispatch<React.SetStateAction<CreateRoleFormState>>;
  live2dModels: Live2dModelOption[];
  fixedQaCatalog: QaItem[];
  indices: IndexItem[];
  saving: boolean;
  isEdit: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const normalizedModelPath = normalizeLive2dModelPath(form.live2dModelPath);
  const currentModel = live2dModels.find((item) => item.modelPath === normalizedModelPath) ?? null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog role-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{isEdit ? "编辑角色" : "创建新角色"}</h3>
            <div className="hint">在弹窗里完成形象、人设、知识库、唤醒词和固定问答的整体配置。</div>
          </div>
          <div className="toolbar">
            <button className="btn btn-light" onClick={onClose}>取消</button>
            <button className="btn btn-primary" disabled={saving || !form.name.trim() || !form.code.trim()} onClick={() => void onSave()}>
              {saving ? "保存中..." : isEdit ? "保存角色设定" : "创建角色"}
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="split role-hero">
            <div className="role-preview-column">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">Live2D 形象预览</h3>
                    <div className="hint">当前所见即角色最终绑定形象。</div>
                  </div>
                  <span className="switch-tag">{currentModel?.name ?? "未选择模型"}</span>
                </div>
                <div>
                  <div className="role-preview-frame">
                    {normalizedModelPath ? (
                      <iframe
                        title="角色预览"
                        src={buildModelPreviewUrl(normalizedModelPath)}
                        className="preview-iframe"
                      />
                    ) : (
                      <div className="empty">请选择一个 Live2D 形象后再预览。</div>
                    )}
                  </div>
                  <div className="settings-status" style={{ marginTop: 16 }}>
                    当前模型：{normalizedModelPath || "未选择"}。创建完成后会绑定到该角色。
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3 className="panel-title">形象选择</h3>
                    <div className="hint">点击下方卡片即可切换形象预览。</div>
                  </div>
                </div>
                {live2dModels.length ? (
                  <div className="model-gallery model-gallery-compact">
                    {live2dModels.map((model) => {
                      const active = normalizedModelPath === model.modelPath;
                      return (
                        <button
                          className={`model-card ${active ? "active" : ""}`}
                          key={model.id}
                          onClick={() => setForm((current) => ({ ...current, live2dModelPath: model.modelPath }))}
                        >
                          <div className="model-card-badge">{model.name.slice(0, 2)}</div>
                          <div className="model-card-body">
                            <strong>{model.name}</strong>
                            <span>{model.modelPath}</span>
                          </div>
                          <span className={`status-pill ${active ? "status-ready" : "status-wait"}`}>{active ? "已选择" : "点击切换"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty">当前未扫描到 Live2D 模型，请检查 `assets/models/live2d_models` 目录。</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">角色基础信息</h3>
                  <div className="hint">一个角色就是一整套形象、人设、知识库和唤醒配置。</div>
                </div>
              </div>
              <div className="form-grid">
                <FieldInput label="角色名称" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                <FieldInput label="角色编码" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} disabled={Boolean(form.id)} />
                <FieldInput label="场景类型" value={form.sceneType} onChange={(value) => setForm((current) => ({ ...current, sceneType: value }))} />
                <FieldInput label="助手名称" value={form.assistantName} onChange={(value) => setForm((current) => ({ ...current, assistantName: value }))} />
                <FieldSelect
                  label="角色状态"
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value as CreateRoleFormState["status"] }))}
                  options={[["enabled", "启用"], ["draft", "草稿"], ["disabled", "停用"], ["archived", "归档"]]}
                />
                <FieldSelect
                  label="绑定知识库"
                  value={form.knowledgeBaseIndexId}
                  onChange={(value) => setForm((current) => ({ ...current, knowledgeBaseIndexId: value }))}
                  options={[
                    ["", "暂不绑定"],
                    ...indices.map((item) => [getIndexId(item), getIndexName(item)] as [string, string]),
                  ]}
                />
                <FieldTextarea label="角色说明" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} placeholder="用于描述角色定位、适用场景、接待对象等" />
                <FieldTextarea label="系统提示词" value={form.systemPrompt} onChange={(value) => setForm((current) => ({ ...current, systemPrompt: value }))} placeholder="定义角色身份、回答风格、边界和约束" />
              </div>
            </div>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-header"><h3 className="panel-title">开场白与唤醒配置</h3></div>
              <div className="form-grid">
                <FieldTextarea
                  label="开场白（每行一条）"
                  value={form.openingMessages.join("\n")}
                  onChange={(value) => setForm((current) => ({ ...current, openingMessages: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="第一条将作为默认开场白"
                />
                <FieldTextarea
                  label="唤醒词（每行一条）"
                  value={form.wakeWords.join("\n")}
                  onChange={(value) => setForm((current) => ({ ...current, wakeWords: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="第一条将作为主唤醒词"
                />
                <FieldTextarea
                  label="打断词（每行一条）"
                  value={form.interruptWords.join("\n")}
                  onChange={(value) => setForm((current) => ({ ...current, interruptWords: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="例如：暂停、别说了、停止"
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">固定问答多选</h3>
                  <div className="hint">为当前角色选择常用标准问答，保存时会同步绑定到角色。</div>
                </div>
              </div>
              {fixedQaCatalog.length ? (
                <div className="role-qa-grid">
                  {fixedQaCatalog.map((item) => {
                    const checked = form.selectedFixedQaIds.includes(item.id);
                    return (
                      <label className={`qa-choice ${checked ? "active" : ""}`} key={item.id}>
                        <div className="qa-choice-head">
                          <strong>{item.question}</strong>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setForm((current) => ({
                              ...current,
                              selectedFixedQaIds: checked
                                ? current.selectedFixedQaIds.filter((value) => value !== item.id)
                                : [...current.selectedFixedQaIds, item.id],
                            }))}
                          />
                        </div>
                        <p>{item.answer}</p>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">当前还没有固定问答，先到“固定问答”模块补充内容后再为角色勾选。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
