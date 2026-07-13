"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KnowledgeManagement,
  MANAGED_INDEX_ID,
  type ConfigStatus,
  type IndexDocument,
  type IndexItem,
  type TaskRecord,
} from "@/components/KnowledgeManagement";
import { DebugMock } from "@/components/dashboard/DebugSection";
import { InstancesPanel } from "@/components/dashboard/InstancesSection";
import { OverviewTabs } from "@/components/dashboard/OverviewSection";
import { PublishPanel } from "@/components/dashboard/PublishSection";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  mergeQaCatalog,
  NavGroup,
  normalizeLive2dModelPath,
  readError,
  setLoadingFlag,
  Toast,
  userRoleText,
} from "@/components/dashboard/shared";
import { UserManagementPanel } from "@/components/dashboard/UserManagementSection";
import {
  consoleNav,
  contentNav,
  type ActivationCodeRecord,
  type CreateRoleFormState,
  type DeviceData,
  type DigitalHumanConfig,
  type DigitalHumanConfigResponse,
  type DigitalHumanConfigVersion,
  type DigitalHumanRecord,
  type HotwordData,
  type InteractionData,
  type Live2dModelOption,
  type NavItem,
  type OverviewTab,
  type PendingActivationRequest,
  type PublishRecord,
  type QaData,
  type SectionKey,
  type UserAccount,
  type UserFormState,
} from "@/components/dashboard/types";

export function Dashboard() {
  const [activeSection, setActiveSection] = useState<SectionKey>("instances");
  const [activeTab, setActiveTab] = useState<OverviewTab>("settings");
  const [pageMeta, setPageMeta] = useState(consoleNav[0]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [digitalHumans, setDigitalHumans] = useState<DigitalHumanRecord[]>([]);
  const [live2dModels, setLive2dModels] = useState<Live2dModelOption[]>([]);
  const [selectedHumanId, setSelectedHumanId] = useState("");
  const [selectedHuman, setSelectedHuman] = useState<DigitalHumanRecord | null>(null);
  const [selectedConfigVersion, setSelectedConfigVersion] = useState<DigitalHumanConfigVersion | null>(null);
  const [interactionData, setInteractionData] = useState<InteractionData | null>(null);
  const [fixedQaData, setFixedQaData] = useState<QaData | null>(null);
  const [faqData, setFaqData] = useState<QaData | null>(null);
  const [hotwordData, setHotwordData] = useState<HotwordData | null>(null);
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([]);
  const [activationRecords, setActivationRecords] = useState<ActivationCodeRecord[]>([]);
  const [pendingActivationRequests, setPendingActivationRequests] = useState<PendingActivationRequest[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState(MANAGED_INDEX_ID);
  const [documents, setDocuments] = useState<IndexDocument[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loadConfig = useCallback(async () => {
    setConfig(await apiGet<ConfigStatus>("/api/config/status"));
  }, []);

  const loadIndices = useCallback(async () => {
    setLoadingFlag("indices", true, setLoading);
    try {
      const body: any = await apiGet("/api/indices");
      const data = body.Data ?? body.data ?? {};
      const list = data.Indices ?? data.indices ?? [];
      setIndices(Array.isArray(list) ? list : []);
      setSelectedIndexId(MANAGED_INDEX_ID);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("indices", false, setLoading);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await apiGet<TaskRecord[]>("/api/tasks"));
    } catch (error) {
      setNotice(readError(error));
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await apiGet<UserAccount>("/api/auth/me");
      setCurrentUser(user);
      return user;
    } catch (error) {
      setNotice(readError(error));
      return null;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (currentUser?.role !== "super_admin") {
      setUsers([]);
      return;
    }
    setLoadingFlag("users", true, setLoading);
    try {
      setUsers(await apiGet<UserAccount[]>("/api/users"));
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("users", false, setLoading);
    }
  }, [currentUser?.role]);

  const loadLive2dModels = useCallback(async () => {
    try {
      setLive2dModels(await apiGet<Live2dModelOption[]>("/api/live2d/admin/models"));
    } catch (error) {
      // 如果失败，回退到原来的 API
      try {
        setLive2dModels(await apiGet<Live2dModelOption[]>("/api/live2d/models"));
      } catch (fallbackError) {
        setNotice(readError(fallbackError));
      }
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoadingFlag("documents", true, setLoading);
    try {
      const body: any = await apiGet(`/api/indices/${MANAGED_INDEX_ID}/documents?pageSize=100`);
      const data = body.Data ?? body.data ?? {};
      const list = data.Documents ?? data.documents ?? [];
      setDocuments(Array.isArray(list) ? list : []);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("documents", false, setLoading);
    }
  }, []);

  const loadDigitalHumans = useCallback(async (preferredId?: string) => {
    setLoadingFlag("digitalHumans", true, setLoading);
    try {
      const list = await apiGet<DigitalHumanRecord[]>("/api/digital-humans");
      setDigitalHumans(list);
      const nextId =
        preferredId
        ?? (list.some((item) => item.id === selectedHumanId) ? selectedHumanId : list[0]?.id ?? "");
      if (nextId) {
        setSelectedHumanId(nextId);
      } else {
        setSelectedHumanId("");
        setSelectedHuman(null);
        setSelectedConfigVersion(null);
      }
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("digitalHumans", false, setLoading);
    }
  }, [selectedHumanId]);

  const loadSelectedHuman = useCallback(async (id: string) => {
    if (!id) {
      setSelectedHuman(null);
      setSelectedConfigVersion(null);
      return;
    }
    setLoadingFlag("selectedHuman", true, setLoading);
    try {
      const [human, configBody] = await Promise.all([
        apiGet<DigitalHumanRecord>(`/api/digital-humans/${id}`),
        apiGet<DigitalHumanConfigResponse>(`/api/digital-humans/${id}/config`),
      ]);
      setSelectedHuman(human);
      setSelectedConfigVersion(configBody.configVersion);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("selectedHuman", false, setLoading);
    }
  }, []);

  const loadSelectedHumanOps = useCallback(async (id: string) => {
    if (!id) {
      setInteractionData(null);
      setFixedQaData(null);
      setFaqData(null);
      setHotwordData(null);
      setPublishRecords([]);
      setActivationRecords([]);
      setDeviceData(null);
      return;
    }
    setLoadingFlag("ops", true, setLoading);
    try {
      const [interaction, qa, faq, hotwords, publishes, activationCodes, devices] = await Promise.all([
        apiGet<InteractionData>(`/api/digital-humans/${id}/interaction`),
        apiGet<QaData>(`/api/digital-humans/${id}/qa`),
        apiGet<QaData>(`/api/digital-humans/${id}/faq`),
        apiGet<HotwordData>(`/api/digital-humans/${id}/hotwords`),
        apiGet<PublishRecord[]>(`/api/digital-humans/${id}/publishes`),
        apiGet<ActivationCodeRecord[]>(`/api/digital-humans/${id}/activation-codes`),
        apiGet<DeviceData>(`/api/digital-humans/${id}/devices`),
      ]);
      setInteractionData(interaction);
      setFixedQaData(qa);
      setFaqData(faq);
      setHotwordData(hotwords);
      setPublishRecords(publishes);
      setActivationRecords(activationCodes);
      setDeviceData(devices);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("ops", false, setLoading);
    }
  }, []);

  const loadPendingActivations = useCallback(async () => {
    setLoadingFlag("pendingActivations", true, setLoading);
    try {
      setPendingActivationRequests(await apiGet<PendingActivationRequest[]>("/api/pending-activations"));
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("pendingActivations", false, setLoading);
    }
  }, []);

  const saveSelectedHumanConfig = useCallback(
    async (payload: Partial<DigitalHumanConfig>) => {
      if (!selectedHumanId) {
        setNotice("请先选择一个数字人实例");
        return;
      }
      setLoadingFlag("saveConfig", true, setLoading);
      try {
        const saved = await apiPut<DigitalHumanConfigVersion>(`/api/digital-humans/${selectedHumanId}/config`, payload);
        setSelectedConfigVersion(saved);
        const refreshed = await apiGet<DigitalHumanRecord>(`/api/digital-humans/${selectedHumanId}`);
        setSelectedHuman(refreshed);
        await loadDigitalHumans(selectedHumanId);
        setNotice(`数字人配置已保存，已生成 V${saved.versionNo} 版本`);
      } catch (error) {
        setNotice(readError(error));
      } finally {
        setLoadingFlag("saveConfig", false, setLoading);
      }
    },
    [loadDigitalHumans, selectedHumanId],
  );

  const saveInteraction = useCallback(async (payload: InteractionData) => {
    if (!selectedHumanId) return;
    setLoadingFlag("saveInteraction", true, setLoading);
    try {
      const saved = await apiPut<InteractionData>(`/api/digital-humans/${selectedHumanId}/interaction`, payload);
      setInteractionData(saved);
      setNotice("交互设置已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("saveInteraction", false, setLoading);
    }
  }, [selectedHumanId]);

  const saveFixedQa = useCallback(async (payload: QaData) => {
    if (!selectedHumanId) return;
    setLoadingFlag("saveQa", true, setLoading);
    try {
      const saved = await apiPut<QaData>(`/api/digital-humans/${selectedHumanId}/qa`, payload);
      setFixedQaData(saved);
      setNotice("固定问答已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("saveQa", false, setLoading);
    }
  }, [selectedHumanId]);

  const saveFaq = useCallback(async (payload: QaData) => {
    if (!selectedHumanId) return;
    setLoadingFlag("saveFaq", true, setLoading);
    try {
      const saved = await apiPut<QaData>(`/api/digital-humans/${selectedHumanId}/faq`, payload);
      setFaqData(saved);
      setNotice("常见问题已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("saveFaq", false, setLoading);
    }
  }, [selectedHumanId]);

  const saveHotwords = useCallback(async (payload: HotwordData) => {
    if (!selectedHumanId) return;
    setLoadingFlag("saveHotwords", true, setLoading);
    try {
      const saved = await apiPut<HotwordData>(`/api/digital-humans/${selectedHumanId}/hotwords`, payload);
      setHotwordData(saved);
      setNotice("热词配置已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("saveHotwords", false, setLoading);
    }
  }, [selectedHumanId]);

  const approvePendingActivation = useCallback(async (roleId: string, requestId: string) => {
    if (!roleId || !requestId) return;
    setLoadingFlag("approvePendingActivation", true, setLoading);
    try {
      await apiPost(`/api/pending-activations/${requestId}/approve`, { digitalHumanId: roleId });
      await Promise.all([loadSelectedHumanOps(roleId), loadPendingActivations()]);
      setNotice("待激活设备已同意激活，App 端会自动完成绑定。");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("approvePendingActivation", false, setLoading);
    }
  }, [loadPendingActivations, loadSelectedHumanOps]);

  const deleteActivatedDevice = useCallback(async (roleId: string, deviceCode: string) => {
    if (!roleId || !deviceCode) return;
    setLoadingFlag("deleteActivatedDevice", true, setLoading);
    try {
      await apiDelete<DeviceData>(`/api/digital-humans/${roleId}/devices`, { deviceCode });
      await Promise.all([loadSelectedHumanOps(roleId), loadPendingActivations()]);
      setNotice("设备绑定已删除，这台设备需要重新激活。");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("deleteActivatedDevice", false, setLoading);
    }
  }, [loadPendingActivations, loadSelectedHumanOps]);

  const saveRoleProfile = useCallback(
    async (payload: CreateRoleFormState) => {
      const fixedQaCatalog = mergeQaCatalog(fixedQaData?.items ?? []);
      const selectedFixedQaItems = fixedQaCatalog
        .filter((item) => payload.selectedFixedQaIds.includes(item.id))
        .map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          status: item.status,
        }));

      setLoadingFlag("saveRoleProfile", true, setLoading);
      try {
        let targetId = payload.id ?? null;
        if (!targetId) {
          const created = await apiPost<DigitalHumanRecord>("/api/digital-humans", {
            code: payload.code,
            name: payload.name,
            sceneType: payload.sceneType,
            assistantName: payload.assistantName,
            description: payload.description,
            status: payload.status,
            initialConfig: {
              live2dModelPath: normalizeLive2dModelPath(payload.live2dModelPath),
              systemPrompt: payload.systemPrompt,
              openingMessage: payload.openingMessages[0] ?? "",
              knowledgeBaseIndexId: payload.knowledgeBaseIndexId,
              selectedFixedQaIds: payload.selectedFixedQaIds,
              wakeWordText: payload.wakeWords[0] ?? "",
            },
            initialInteraction: {
              openingMessages: payload.openingMessages.filter(Boolean),
              wakeWords: payload.wakeWords.filter(Boolean),
              standbyCommands: interactionData?.standbyCommands ?? [],
              interruptWords: payload.interruptWords.filter(Boolean),
              fallbackMessages: interactionData?.fallbackMessages ?? [],
            },
            fixedQaItems: selectedFixedQaItems,
          });
          targetId = created.id;
          setNotice(`角色已创建：${created.name}`);
        } else {
          await apiPut<DigitalHumanRecord>(`/api/digital-humans/${targetId}`, {
            name: payload.name,
            sceneType: payload.sceneType,
            assistantName: payload.assistantName,
            description: payload.description,
            status: payload.status,
          });
          await apiPut<DigitalHumanConfigVersion>(`/api/digital-humans/${targetId}/config`, {
            live2dModelPath: normalizeLive2dModelPath(payload.live2dModelPath),
            systemPrompt: payload.systemPrompt,
            openingMessage: payload.openingMessages[0] ?? "",
            knowledgeBaseIndexId: payload.knowledgeBaseIndexId,
            selectedFixedQaIds: payload.selectedFixedQaIds,
            wakeWordText: payload.wakeWords[0] ?? "",
          });
          await apiPut<InteractionData>(`/api/digital-humans/${targetId}/interaction`, {
            openingMessages: payload.openingMessages.filter(Boolean),
            wakeWords: payload.wakeWords.filter(Boolean),
            standbyCommands: interactionData?.standbyCommands ?? [],
            interruptWords: payload.interruptWords.filter(Boolean),
            fallbackMessages: interactionData?.fallbackMessages ?? [],
          });
          await apiPut<QaData>(`/api/digital-humans/${targetId}/qa`, {
            items: selectedFixedQaItems.map((item) => ({
              id: item.id,
              question: item.question,
              answer: item.answer,
              status: item.status,
            })),
          });
          setNotice(`角色已更新：${payload.name}`);
        }
        if (targetId) {
          await loadDigitalHumans(targetId);
          setSelectedHumanId(targetId);
          setActiveSection("instances");
        }
      } catch (error) {
        setNotice(readError(error));
      } finally {
        setLoadingFlag("saveRoleProfile", false, setLoading);
      }
    },
    [fixedQaData?.items, interactionData?.fallbackMessages, interactionData?.standbyCommands, loadDigitalHumans],
  );

  const deleteRoleProfile = useCallback(
    async (role: DigitalHumanRecord) => {
      const confirmed = window.confirm(`确认删除角色“${role.name}”吗？删除后角色配置、固定问答绑定、发布记录和设备记录都会一起清理。`);
      if (!confirmed) {
        return;
      }

      setLoadingFlag("deleteRoleProfile", true, setLoading);
      try {
        await apiDelete<{ id: string; deleted: true }>(`/api/digital-humans/${role.id}`);
        await loadDigitalHumans(role.id === selectedHumanId ? undefined : selectedHumanId);
        setNotice(`角色“${role.name}”已删除`);
      } catch (error) {
        setNotice(readError(error));
      } finally {
        setLoadingFlag("deleteRoleProfile", false, setLoading);
      }
    },
    [loadDigitalHumans, selectedHumanId],
  );

  const createUserAccount = useCallback(async (payload: UserFormState) => {
    setLoadingFlag("saveUser", true, setLoading);
    try {
      await apiPost<UserAccount>("/api/users", payload);
      await loadUsers();
      setNotice(`用户“${payload.username}”已创建`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag("saveUser", false, setLoading);
    }
  }, [loadUsers]);

  const updateUserAccount = useCallback(async (id: string, payload: Partial<UserFormState>) => {
    setLoadingFlag(`user-${id}`, true, setLoading);
    try {
      await apiPut<UserAccount>(`/api/users/${id}`, payload);
      await loadUsers();
      if (id === currentUser?.id) {
        await loadCurrentUser();
      }
      setNotice("用户信息已更新");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag(`user-${id}`, false, setLoading);
    }
  }, [currentUser?.id, loadCurrentUser, loadUsers]);

  const deleteUserAccount = useCallback(async (user: UserAccount) => {
    const confirmed = window.confirm(`确认删除用户“${user.displayName || user.username}”吗？`);
    if (!confirmed) return;

    setLoadingFlag(`user-${user.id}`, true, setLoading);
    try {
      await apiDelete<UserAccount>(`/api/users/${user.id}`);
      await loadUsers();
      setNotice(`用户“${user.username}”已删除`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setLoadingFlag(`user-${user.id}`, false, setLoading);
    }
  }, [loadUsers]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } finally {
      window.location.href = "/login";
    }
  }, []);

  const visibleConsoleNav = currentUser?.role === "super_admin"
    ? consoleNav
    : consoleNav.filter((item) => item.section !== "users");

  useEffect(() => {
    void (async () => {
      const user = await loadCurrentUser();
      if (user?.role === "super_admin") {
        await loadUsers();
      } else {
        setUsers([]);
      }
      await Promise.all([
        loadConfig(),
        loadDigitalHumans(),
        loadLive2dModels(),
        loadIndices(),
        loadDocuments(),
        loadTasks(),
        loadPendingActivations(),
      ]);
    })();
  }, [loadConfig, loadCurrentUser, loadDigitalHumans, loadDocuments, loadIndices, loadLive2dModels, loadPendingActivations, loadTasks, loadUsers]);

  useEffect(() => {
    if (activeSection === "users" && currentUser?.role !== "super_admin") {
      setActiveSection("instances");
      setPageMeta(consoleNav[0]);
    }
  }, [activeSection, currentUser?.role]);

  useEffect(() => {
    if (!selectedHumanId) {
      setSelectedHuman(null);
      setSelectedConfigVersion(null);
      setInteractionData(null);
      setFixedQaData(null);
      setFaqData(null);
      setHotwordData(null);
      setPublishRecords([]);
      setActivationRecords([]);
      setDeviceData(null);
      return;
    }
    void loadSelectedHuman(selectedHumanId);
    void loadSelectedHumanOps(selectedHumanId);
  }, [loadSelectedHuman, loadSelectedHumanOps, selectedHumanId]);

  useEffect(() => {
    if (!tasks.some((task) => task.status === "running")) return;
    const timer = window.setInterval(() => {
      void Promise.all(tasks.filter((task) => task.status === "running").map((task) => apiGet(`/api/tasks/${task.id}`)));
      void loadTasks();
      void loadIndices();
      void loadDocuments();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadDocuments, loadIndices, loadTasks, tasks]);

  function activate(item: NavItem) {
    setActiveSection(item.section);
    setPageMeta(item);
    if (item.section === "overview") setActiveTab(item.tab ?? "settings");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">AI</div>
          <div>
            <h1>数字人管理后台</h1>
            <p>角色配置、知识库、问答运营一体化</p>
          </div>
        </div>

        <NavGroup title="控制台" items={visibleConsoleNav} activeSection={activeSection} activeTab={activeTab} onActivate={activate} />
        <NavGroup title="内容运营" items={contentNav} activeSection={activeSection} activeTab={activeTab} onActivate={activate} />

        <div className="sidebar-card">
          <h3>本页说明</h3>
          <p>当前后台以“先设定角色，再发布绑定设备”为主线，角色包含 Live2D 形象、人设、知识库、唤醒词和固定问答。</p>
          <ul>
            <li>角色设定支持真实创建、更新和模型预览</li>
            <li>知识库列表、检索和任务接后端</li>
            <li>发布中心按角色发码并自动绑定设备</li>
          </ul>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>{pageMeta.title}</h2>
            <p>{pageMeta.desc}</p>
          </div>
          <div className="top-actions">
            <span className="settings-status">
              {currentUser ? `${currentUser.displayName || currentUser.username} / ${userRoleText(currentUser.role)}` : "加载账号中"}
            </span>
            <button className="btn btn-light" onClick={() => void logout()}>退出登录</button>
          </div>
        </div>

        <section className={`app-section ${activeSection === "overview" ? "active" : ""}`}>
          <OverviewTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            selectedHuman={selectedHuman}
            selectedConfigVersion={selectedConfigVersion}
            saveLoading={Boolean(loading.saveConfig)}
            onSaveConfig={saveSelectedHumanConfig}
            onRefreshSelected={() => void loadSelectedHuman(selectedHumanId)}
            interactionData={interactionData}
            fixedQaData={fixedQaData}
            faqData={faqData}
            hotwordData={hotwordData}
            onSaveInteraction={saveInteraction}
            onSaveQa={saveFixedQa}
            onSaveFaq={saveFaq}
            onSaveHotwords={saveHotwords}
            opsLoading={loading}
          />
        </section>

        <section className={`app-section ${activeSection === "instances" ? "active" : ""}`}>
          <InstancesPanel
            digitalHumans={digitalHumans}
            live2dModels={live2dModels}
            loading={Boolean(loading.digitalHumans) || Boolean(loading.selectedHuman)}
            selectedHumanId={selectedHumanId}
            selectedHuman={selectedHuman}
            selectedConfigVersion={selectedConfigVersion}
            interactionData={interactionData}
            fixedQaData={fixedQaData}
            indices={indices}
            saving={Boolean(loading.saveRoleProfile)}
            deleting={Boolean(loading.deleteRoleProfile)}
            onSelect={(id) => setSelectedHumanId(id)}
            onRefresh={() => void loadDigitalHumans(selectedHumanId)}
            onSaveRole={saveRoleProfile}
            onDeleteRole={deleteRoleProfile}
          />
        </section>

        <section className={`app-section ${activeSection === "publish" ? "active" : ""}`}>
          <PublishPanel
            digitalHumans={digitalHumans}
            selectedHumanId={selectedHumanId}
            selectedHuman={selectedHuman}
            selectedConfigVersion={selectedConfigVersion}
            publishRecords={publishRecords}
            activationRecords={activationRecords}
            pendingActivationRequests={pendingActivationRequests}
            deviceData={deviceData}
            loading={loading}
            onSelectRole={setSelectedHumanId}
            onApprovePendingActivation={approvePendingActivation}
            onDeleteActivatedDevice={deleteActivatedDevice}
            onRefresh={() => void Promise.all([loadSelectedHumanOps(selectedHumanId), loadPendingActivations()])}
          />
        </section>

        <section className={`app-section ${activeSection === "debug" ? "active" : ""}`}>
          <DebugMock selectedHumanId={selectedHumanId} selectedIndexId={selectedIndexId} indices={indices} />
        </section>

        {currentUser?.role === "super_admin" ? (
          <section className={`app-section ${activeSection === "users" ? "active" : ""}`}>
            <UserManagementPanel
              users={users}
              currentUser={currentUser}
              loading={loading}
              onCreate={createUserAccount}
              onUpdate={updateUserAccount}
              onDelete={deleteUserAccount}
              onRefresh={loadUsers}
            />
          </section>
        ) : null}

        <section className={`app-section ${activeSection === "knowledge" ? "active" : ""}`}>
          <KnowledgeManagement
            config={config}
            indices={indices}
            documents={documents}
            tasks={tasks}
            loading={loading}
            setNotice={setNotice}
            reloadDocuments={loadDocuments}
            reloadTasks={loadTasks}
          />
        </section>
      </main>

      {notice && <Toast message={notice} onClose={() => setNotice(null)} />}
    </div>
  );
}
