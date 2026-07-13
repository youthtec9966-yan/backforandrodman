"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRecord as UserAccount, UserStatus } from "@/lib/userStore";

type ManagedAdmin = UserAccount & {
  activatedDeviceCount?: number;
};

type Live2dModelItem = {
  id: string;
  name: string;
  folderName: string;
  modelPath: string;
  previewUrl: string;
};

type SystemSettingsForm = {
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
};

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

type AdminFormState = {
  username: string;
  displayName: string;
  password: string;
  deviceQuota: string;
  status: UserStatus;
};

export function SuperAdminPanel() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [live2dModels, setLive2dModels] = useState<Live2dModelItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [systemSettings, setSystemSettings] = useState<SystemSettingsForm>({
    alibabaCloudAccessKeyId: "",
    alibabaCloudAccessKeySecret: "",
    bailianWorkspaceId: "",
    bailianEndpoint: "bailian.cn-beijing.aliyuncs.com",
    authJwtSecret: "",
    cookieSecure: false,
    appDashscopeApiKey: "",
    appLlmApiKey: "",
    appAsrApiKey: "",
    appTtsApiKey: "",
    appBaseUrl: "https://dashscope.aliyuncs.com",
  });
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, string>>({});
  const [modelNameDrafts, setModelNameDrafts] = useState<Record<string, string>>({});
  const [allowedModelDrafts, setAllowedModelDrafts] = useState<Record<string, string[]>>({});
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolderName, setUploadFolderName] = useState("");
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadInputVersion, setUploadInputVersion] = useState(0);
  const [form, setForm] = useState<AdminFormState>({
    username: "",
    displayName: "",
    password: "",
    deviceQuota: "0",
    status: "enabled",
  });

  const enabledAdmins = admins.filter((item) => item.status === "enabled");
  const usedQuota = admins.reduce((sum, item) => sum + (item.activatedDeviceCount ?? 0), 0);
  const totalQuota = admins.reduce((sum, item) => sum + Math.max(0, item.deviceQuota), 0);

  async function loadData() {
    try {
      setLoadingFlag("page", true, setLoading);
      const me = await apiGet<UserAccount>("/api/auth/me");
      if (me.role !== "super_admin") {
        window.location.href = "/workspace";
        return;
      }
      setCurrentUser(me);
      const [users, models, settings] = await Promise.all([
        apiGet<ManagedAdmin[]>("/api/users"),
        apiGet<Live2dModelItem[]>("/api/live2d/admin/models"),
        apiGet<SystemSettingsForm>("/api/system/settings"),
      ]);
      const adminUsers = users.filter((item) => item.role === "admin");
      setAdmins(adminUsers);
      setLive2dModels(models);
      setSystemSettings(settings);
      setQuotaDrafts(Object.fromEntries(adminUsers.map((item) => [item.id, String(Math.max(0, item.deviceQuota))])));
      setAllowedModelDrafts(
        Object.fromEntries(adminUsers.map((item) => [item.id, Array.isArray(item.allowedLive2dModelIds) ? item.allowedLive2dModelIds : []]))
      );
      setModelNameDrafts(Object.fromEntries(models.map((item) => [item.id, item.name])));
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag("page", false, setLoading);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const quotaUsageText = useMemo(() => `${usedQuota} / ${totalQuota || 0}`, [totalQuota, usedQuota]);
  const configuredServiceKeyCount = useMemo(
    () => [systemSettings.appDashscopeApiKey, systemSettings.appLlmApiKey, systemSettings.appAsrApiKey, systemSettings.appTtsApiKey]
      .filter((value) => value.trim()).length,
    [systemSettings.appAsrApiKey, systemSettings.appDashscopeApiKey, systemSettings.appLlmApiKey, systemSettings.appTtsApiKey]
  );
  const activeModelAuthCount = useMemo(
    () => admins.filter((admin) => (allowedModelDrafts[admin.id] ?? []).length > 0).length,
    [admins, allowedModelDrafts]
  );
  const quickOverviewCards = useMemo(() => ([
    { label: "系统角色", value: "超级管理员", note: currentUser ? `当前账号：${currentUser.displayName || currentUser.username}` : "加载账号中" },
    { label: "服务配置", value: `${configuredServiceKeyCount}/4`, note: "App 通用 / LLM / ASR / TTS Key 已配置数量" },
    { label: "模型授权中", value: `${activeModelAuthCount}`, note: "已分配至少 1 个模型的管理员数量" },
  ]), [activeModelAuthCount, configuredServiceKeyCount, currentUser]);
  const workSuggestions = ["先配系统密钥", "再创建管理员", "最后分配模型权限"];

  async function handleCreateAdmin() {
    setLoadingFlag("createAdmin", true, setLoading);
    try {
      await apiPost<ManagedAdmin>("/api/users", {
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        role: "admin",
        status: form.status,
        deviceQuota: parseQuota(form.deviceQuota),
      });
      setForm({
        username: "",
        displayName: "",
        password: "",
        deviceQuota: "0",
        status: "enabled",
      });
      await loadData();
      setMessage("管理员账号已创建");
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag("createAdmin", false, setLoading);
    }
  }

  async function handleSaveQuota(admin: ManagedAdmin) {
    setLoadingFlag(`admin-${admin.id}`, true, setLoading);
    try {
      await apiPut<ManagedAdmin>(`/api/users/${admin.id}`, {
        deviceQuota: parseQuota(quotaDrafts[admin.id] ?? String(admin.deviceQuota)),
      });
      await loadData();
      setMessage(`管理员“${admin.displayName || admin.username}”额度已更新`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`admin-${admin.id}`, false, setLoading);
    }
  }

  async function handleResetPassword(admin: ManagedAdmin) {
    const password = passwordDrafts[admin.id]?.trim() ?? "";
    if (password.length < 6) return;
    setLoadingFlag(`admin-${admin.id}`, true, setLoading);
    try {
      await apiPut<ManagedAdmin>(`/api/users/${admin.id}`, { password });
      setPasswordDrafts((current) => ({ ...current, [admin.id]: "" }));
      setMessage(`管理员“${admin.displayName || admin.username}”密码已重置`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`admin-${admin.id}`, false, setLoading);
    }
  }

  async function handleToggleStatus(admin: ManagedAdmin) {
    setLoadingFlag(`admin-${admin.id}`, true, setLoading);
    try {
      await apiPut<ManagedAdmin>(`/api/users/${admin.id}`, {
        status: admin.status === "enabled" ? "disabled" : "enabled",
      });
      await loadData();
      setMessage(`管理员“${admin.displayName || admin.username}”状态已更新`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`admin-${admin.id}`, false, setLoading);
    }
  }

  async function handleDeleteAdmin(admin: ManagedAdmin) {
    if (!window.confirm(`确认删除管理员“${admin.displayName || admin.username}”吗？`)) {
      return;
    }
    setLoadingFlag(`admin-${admin.id}`, true, setLoading);
    try {
      await apiDelete<ManagedAdmin>(`/api/users/${admin.id}`);
      await loadData();
      setMessage(`管理员“${admin.displayName || admin.username}”已删除`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`admin-${admin.id}`, false, setLoading);
    }
  }

  async function handleLogout() {
    try {
      await apiPost("/api/auth/logout", {});
    } finally {
      window.location.href = "/login";
    }
  }

  async function handleSaveSystemSettings() {
    setLoadingFlag("system-settings", true, setLoading);
    try {
      await apiPut<SystemSettingsForm>("/api/system/settings", systemSettings);
      await loadData();
      setMessage("系统密钥配置已保存");
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag("system-settings", false, setLoading);
    }
  }

  function handleSelectUploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    setUploadFiles(files);
    const inferredFolder = deriveFolderNameFromFiles(files);
    setUploadFolderName(inferredFolder);
    if (!uploadDisplayName.trim()) {
      setUploadDisplayName(inferredFolder);
    }
  }

  async function handleUploadModel() {
    if (!uploadFiles.length) {
      setMessage("请先选择一个 Live2D 模型目录");
      return;
    }
    setLoadingFlag("uploadModel", true, setLoading);
    try {
      const formData = new FormData();
      formData.append("folderName", uploadFolderName.trim());
      formData.append("displayName", uploadDisplayName.trim() || uploadFolderName.trim());
      for (const file of uploadFiles) {
        formData.append("files", file, file.name);
        formData.append("paths", file.webkitRelativePath || file.name);
      }
      await apiPostForm("/api/live2d/admin/models", formData);
      setUploadFiles([]);
      setUploadFolderName("");
      setUploadDisplayName("");
      setUploadInputVersion((current) => current + 1);
      await loadData();
      setMessage("Live2D 模型已上传");
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag("uploadModel", false, setLoading);
    }
  }

  async function handleSaveModelName(model: Live2dModelItem) {
    const displayName = modelNameDrafts[model.id]?.trim() ?? "";
    if (!displayName) {
      setMessage("模型名称不能为空");
      return;
    }
    setLoadingFlag(`model-${model.id}`, true, setLoading);
    try {
      await apiPut(`/api/live2d/admin/models?id=${encodeURIComponent(model.id)}`, { displayName });
      await loadData();
      setMessage(`模型“${model.folderName}”名称已更新`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`model-${model.id}`, false, setLoading);
    }
  }

  async function handleDeleteModel(model: Live2dModelItem) {
    if (!window.confirm(`确认删除模型“${model.name}”吗？删除后相关管理员授权也会一并清理。`)) {
      return;
    }
    setLoadingFlag(`model-${model.id}`, true, setLoading);
    try {
      await apiDelete(`/api/live2d/admin/models?id=${encodeURIComponent(model.id)}`);
      await loadData();
      setMessage(`模型“${model.name}”已删除`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`model-${model.id}`, false, setLoading);
    }
  }

  function toggleAllowedModel(adminId: string, modelId: string, checked: boolean) {
    setAllowedModelDrafts((current) => {
      const existing = Array.isArray(current[adminId]) ? current[adminId] : [];
      const next = checked
        ? Array.from(new Set([...existing, modelId]))
        : existing.filter((item) => item !== modelId);
      return { ...current, [adminId]: next };
    });
  }

  async function handleSaveAllowedModels(admin: ManagedAdmin) {
    setLoadingFlag(`model-auth-${admin.id}`, true, setLoading);
    try {
      await apiPut(`/api/users/${admin.id}`, {
        allowedLive2dModelIds: allowedModelDrafts[admin.id] ?? [],
      });
      await loadData();
      setMessage(`管理员“${admin.displayName || admin.username}”模型权限已更新`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setLoadingFlag(`model-auth-${admin.id}`, false, setLoading);
    }
  }

  return (
    <div className="app-shell super-admin-shell">
      <main className="app-main super-admin-main">
        <section className="panel super-admin-top-strip">
          <div className="super-admin-strip-brand">
            <div className="brand">
           
              <div>
                <h1>超级管理员</h1>
                <p>统一管理账号、模型、授权额度与系统密钥</p>
              </div>
            </div>
          </div>
        
          <div className="super-admin-strip-actions">
            <button className="btn btn-primary" onClick={() => void loadData()} disabled={Boolean(loading.page)}>
              {loading.page ? "刷新中..." : "刷新全部数据"}
            </button>
            <button className="btn btn-light" onClick={() => void handleLogout()}>退出登录</button>
          </div>
        </section>

        {message ? <div className="settings-status success super-admin-banner">{message}</div> : null}

        <div className="role-stat-grid super-admin-stats">
          <div className="stat-tile">
            <span>管理员总数</span>
            <strong>{admins.length}</strong>
            <p>这里只统计普通管理员账号</p>
          </div>
          <div className="stat-tile">
            <span>启用管理员</span>
            <strong>{enabledAdmins.length}</strong>
            <p>停用后无法审批终端激活</p>
          </div>
          <div className="stat-tile">
            <span>授权额度</span>
            <strong>{totalQuota}</strong>
            <p>管理员合计可激活终端数</p>
          </div>
          <div className="stat-tile">
            <span>已用额度</span>
            <strong>{quotaUsageText}</strong>
            <p>按管理员已审批且仍绑定的终端统计</p>
          </div>
        </div>

        <section className="super-admin-section-grid">
          <div className="panel super-admin-section-card">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">新增管理员</h3>
                <div className="hint">创建后可直接登录 `workspace` 管理台，开始审批终端与维护角色。</div>
              </div>
            </div>
            <div className="form-grid">
              <FieldInput label="管理员账号" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} />
              <FieldInput label="显示名称" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} />
              <FieldInput label="初始密码" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
              <FieldInput label="授权终端数" type="number" value={form.deviceQuota} onChange={(value) => setForm((current) => ({ ...current, deviceQuota: value }))} />
              <FieldSelect
                label="状态"
                value={form.status}
                onChange={(value) => setForm((current) => ({ ...current, status: value as UserStatus }))}
                options={[["enabled", "启用"], ["disabled", "停用"]]}
              />
            </div>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary"
                disabled={Boolean(loading.createAdmin) || !form.username.trim() || form.password.trim().length < 6}
                onClick={() => void handleCreateAdmin()}
              >
                {loading.createAdmin ? "创建中..." : "创建管理员"}
              </button>
            </div>
            <div className="settings-status super-admin-inline-note" style={{ marginTop: 16 }}>
              管理员设备额度为 `0` 时，无法审批任何终端激活。
            </div>
          </div>

          <div className="panel super-admin-section-card">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">系统密钥设置</h3>
                <div className="hint">服务端百炼调用、App 默认访问和登录鉴权统一从这里读取，`.env` 仅作为兜底。</div>
              </div>
            </div>
            <div className="super-admin-settings-layout">
              <div className="super-admin-settings-group">
                <div className="super-admin-settings-group-head">
                  <strong>云服务凭证</strong>
                  <span>百炼工作空间与服务端调用主密钥</span>
                </div>
                <div className="form-grid">
                  <FieldInput label="阿里云 AccessKey ID" value={systemSettings.alibabaCloudAccessKeyId} onChange={(value) => setSystemSettings((current) => ({ ...current, alibabaCloudAccessKeyId: value }))} />
                  <FieldInput label="阿里云 AccessKey Secret" type="password" value={systemSettings.alibabaCloudAccessKeySecret} onChange={(value) => setSystemSettings((current) => ({ ...current, alibabaCloudAccessKeySecret: value }))} />
                  <FieldInput label="百炼 Workspace ID" value={systemSettings.bailianWorkspaceId} onChange={(value) => setSystemSettings((current) => ({ ...current, bailianWorkspaceId: value }))} />
                  <FieldInput label="百炼 Endpoint" value={systemSettings.bailianEndpoint} onChange={(value) => setSystemSettings((current) => ({ ...current, bailianEndpoint: value }))} />
                </div>
              </div>
              <div className="super-admin-settings-group">
                <div className="super-admin-settings-group-head">
                  <strong>App 默认访问配置</strong>
                  <span>终端下发默认地址和 API Key，专用 Key 留空时自动回退通用 Key。</span>
                </div>
                <div className="form-grid">
                  <FieldInput label="App 通用 API Key" type="password" value={systemSettings.appDashscopeApiKey} onChange={(value) => setSystemSettings((current) => ({ ...current, appDashscopeApiKey: value }))} />
                  <FieldInput label="App LLM API Key" type="password" value={systemSettings.appLlmApiKey} onChange={(value) => setSystemSettings((current) => ({ ...current, appLlmApiKey: value }))} />
                  <FieldInput label="App ASR API Key" type="password" value={systemSettings.appAsrApiKey} onChange={(value) => setSystemSettings((current) => ({ ...current, appAsrApiKey: value }))} />
                  <FieldInput label="App TTS API Key" type="password" value={systemSettings.appTtsApiKey} onChange={(value) => setSystemSettings((current) => ({ ...current, appTtsApiKey: value }))} />
                  <FieldInput label="App Base URL" value={systemSettings.appBaseUrl} onChange={(value) => setSystemSettings((current) => ({ ...current, appBaseUrl: value }))} />
                </div>
              </div>
              <div className="super-admin-settings-group">
                <div className="super-admin-settings-group-head">
                  <strong>认证安全</strong>
                  <span>影响登录态、Cookie 安全策略和中间件签名校验。</span>
                </div>
                <div className="form-grid">
                  <FieldInput label="JWT Secret" type="password" value={systemSettings.authJwtSecret} onChange={(value) => setSystemSettings((current) => ({ ...current, authJwtSecret: value }))} />
                  <label className="field">
                    <span className="label">Cookie Secure</span>
                    <select
                      className="select"
                      value={systemSettings.cookieSecure ? "true" : "false"}
                      onChange={(event) => setSystemSettings((current) => ({ ...current, cookieSecure: event.target.value === "true" }))}
                    >
                      <option value="false">关闭</option>
                      <option value="true">开启</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" disabled={Boolean(loading["system-settings"])} onClick={() => void handleSaveSystemSettings()}>
                {loading["system-settings"] ? "保存中..." : "保存系统密钥"}
              </button>
            </div>
            <div className="settings-status super-admin-inline-note" style={{ marginTop: 16 }}>
              修改 JWT Secret 后，当前所有登录态都会失效，需要重新登录。
            </div>
            <div className="settings-status super-admin-inline-note" style={{ marginTop: 8 }}>
              如果某项专用 Key 留空，服务端会自动回退到“App 通用 API Key”。
            </div>
          </div>
        </section>

        <section className="super-admin-section-grid super-admin-section-grid-wide">
          <div className="panel super-admin-section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">模型上传</h3>
              <div className="hint">直接选择整个 Live2D 模型目录上传，系统会自动校验根目录下的 `.model3.json`。</div>
            </div>
          </div>
          <div className="form-grid">
            <label className="field full">
              <span className="label">模型目录</span>
              <input
                key={uploadInputVersion}
                className="input"
                type="file"
                multiple
                {...({ webkitdirectory: "true", directory: "" } as Record<string, string>)}
                onChange={(event) => handleSelectUploadFiles(event.target.files)}
              />
            </label>
            <FieldInput label="目录名称" value={uploadFolderName} onChange={setUploadFolderName} />
            <FieldInput label="显示名称" value={uploadDisplayName} onChange={setUploadDisplayName} />
          </div>
          <div className="settings-status super-admin-inline-note" style={{ marginTop: 16 }}>
            {uploadFiles.length
              ? `已选择 ${uploadFiles.length} 个文件，目录：${uploadFolderName || "未识别"}`
              : "请选择一个包含 .model3.json 的 Live2D 模型目录。"}
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={Boolean(loading.uploadModel) || !uploadFiles.length || !uploadFolderName.trim()}
              onClick={() => void handleUploadModel()}
            >
              {loading.uploadModel ? "上传中..." : "上传模型"}
            </button>
          </div>
          </div>

          <div className="panel super-admin-section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">模型库</h3>
              <div className="hint">支持重命名模型、预览效果，或彻底删除无效模型。</div>
            </div>
          </div>
          <div className="kb-table-scroll">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>显示名称</th>
                  <th>目录</th>
                  <th>模型路径</th>
                  <th>预览</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {live2dModels.length ? live2dModels.map((model) => {
                  const busy = Boolean(loading[`model-${model.id}`]);
                  return (
                    <tr key={model.id}>
                      <td>
                        <div className="list-input">
                          <input
                            className="input"
                            value={modelNameDrafts[model.id] ?? model.name}
                            onChange={(event) => setModelNameDrafts((current) => ({ ...current, [model.id]: event.target.value }))}
                          />
                          <button className="btn btn-light" disabled={busy} onClick={() => void handleSaveModelName(model)}>
                            保存
                          </button>
                        </div>
                      </td>
                      <td>
                        <strong>{model.folderName}</strong>
                      </td>
                      <td>
                        <span className="kb-muted">{model.modelPath}</span>
                      </td>
                      <td>
                        <a href={model.previewUrl} target="_blank" rel="noreferrer">预览</a>
                      </td>
                      <td>
                        <button className="btn btn-danger" disabled={busy} onClick={() => void handleDeleteModel(model)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="table-empty">当前还没有 Live2D 模型。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </section>

        <div className="panel super-admin-section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">管理员列表</h3>
              <div className="hint">可调整授权终端数、重置密码、启停或删除管理员账号。</div>
            </div>
          </div>
          <div className="kb-table-scroll">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>管理员</th>
                  <th>状态</th>
                  <th>已激活 / 授权</th>
                  <th>最近登录</th>
                  <th>重置密码</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {admins.length ? admins.map((admin) => {
                  const busy = Boolean(loading[`admin-${admin.id}`]);
                  return (
                    <tr key={admin.id}>
                      <td>
                        <strong>{admin.displayName || admin.username}</strong>
                        <div className="kb-muted">{admin.username}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${admin.status === "enabled" ? "status-ready" : "status-wait"}`}>
                          {admin.status === "enabled" ? "启用" : "停用"}
                        </span>
                      </td>
                      <td>
                        <div className="list-input">
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={quotaDrafts[admin.id] ?? String(Math.max(0, admin.deviceQuota))}
                            onChange={(event) => setQuotaDrafts((current) => ({ ...current, [admin.id]: event.target.value }))}
                          />
                          <button className="btn btn-light" disabled={busy} onClick={() => void handleSaveQuota(admin)}>
                            保存
                          </button>
                        </div>
                        <div className="kb-muted" style={{ marginTop: 8 }}>
                          已使用 {admin.activatedDeviceCount ?? 0} 台 / 已授权 {Math.max(0, admin.deviceQuota)} 台
                        </div>
                      </td>
                      <td>{formatNullableDate(admin.lastLoginAt)}</td>
                      <td>
                        <div className="list-input">
                          <input
                            className="input"
                            type="password"
                            value={passwordDrafts[admin.id] ?? ""}
                            placeholder="输入新密码"
                            onChange={(event) => setPasswordDrafts((current) => ({ ...current, [admin.id]: event.target.value }))}
                          />
                          <button
                            className="btn btn-light"
                            disabled={busy || (passwordDrafts[admin.id]?.trim().length ?? 0) < 6}
                            onClick={() => void handleResetPassword(admin)}
                          >
                            重置
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="toolbar">
                          <button className="btn btn-light" disabled={busy} onClick={() => void handleToggleStatus(admin)}>
                            {admin.status === "enabled" ? "停用" : "启用"}
                          </button>
                          <button className="btn btn-danger" disabled={busy} onClick={() => void handleDeleteAdmin(admin)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="table-empty">当前还没有管理员账号。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel super-admin-section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">模型授权</h3>
              <div className="hint">勾选后，管理员在角色配置中才能看到对应 Live2D 模型。</div>
            </div>
          </div>
          <div className="super-admin-auth-grid">
            {admins.length ? admins.map((admin) => {
              const selectedIds = allowedModelDrafts[admin.id] ?? [];
              const busy = Boolean(loading[`model-auth-${admin.id}`]);
              return (
                <div className="super-admin-auth-card" key={admin.id}>
                  <div className="super-admin-auth-head">
                    <div>
                      <strong>{admin.displayName || admin.username}</strong>
                      <div className="kb-muted">{admin.username} · 已授权 {selectedIds.length} 个模型</div>
                    </div>
                    <button className="btn btn-light" disabled={busy} onClick={() => void handleSaveAllowedModels(admin)}>
                      {busy ? "保存中..." : "保存权限"}
                    </button>
                  </div>
                  {live2dModels.length ? (
                    <div className="super-admin-model-choice-grid">
                      {live2dModels.map((model) => {
                        const checked = selectedIds.includes(model.id);
                        return (
                          <label className={`super-admin-model-choice ${checked ? "active" : ""}`} key={model.id}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => toggleAllowedModel(admin.id, model.id, event.target.checked)}
                            />
                            <span>
                              <strong>{model.name}</strong>
                              <div className="kb-muted">{model.folderName}</div>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="table-empty super-admin-empty">请先上传 Live2D 模型后再分配给管理员。</div>
                  )}
                </div>
              );
            }) : (
              <div className="table-empty super-admin-empty">请先创建管理员账号。</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function MiniCards({ items }: { items: string[] }) {
  return (
    <div className="mini-grid">
      {items.map((item) => (
        <div className="mini-card" key={item}>{item}</div>
      ))}
    </div>
  );
}

function parseQuota(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function deriveFolderNameFromFiles(files: File[]) {
  const first = files[0];
  if (!first) return "";
  const relativePath = first.webkitRelativePath || first.name;
  return relativePath.split("/").filter(Boolean)[0] ?? "";
}

function setLoadingFlag(key: string, value: boolean, setLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) {
  setLoading((current) => ({ ...current, [key]: value }));
}

function formatNullableDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function apiGet<T>(url: string): Promise<T> {
  return unwrapApi<T>(await fetch(url));
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function apiPostForm<T>(url: string, body: FormData): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "POST",
    body,
  }));
}

async function apiPut<T>(url: string, body: unknown): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function apiDelete<T>(url: string): Promise<T> {
  return unwrapApi<T>(await fetch(url, {
    method: "DELETE",
  }));
}

async function unwrapApi<T>(response: Response): Promise<T> {
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.ok) {
    throw new Error(!envelope.ok ? envelope.error.message : response.statusText);
  }
  return envelope.data;
}
