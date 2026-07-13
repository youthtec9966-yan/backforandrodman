import { getCurrentConfigVersion, getDigitalHuman, getDigitalHumanDb } from "@/lib/digitalHumanStore";
import {
  approvePendingActivationRequest,
  countActiveDevicesApprovedByUser,
  findActivationCodeByDeviceCode,
  findPendingActivationRequestByDeviceCode,
  getDevices,
  getFaq,
  getFixedQa,
  getHotwords,
  getInteractionSettings,
  registerPendingActivationRequest,
  verifyActivationCode,
  type DeviceBinding,
} from "@/lib/digitalHumanOpsStore";
import { encryptAppServiceSecrets, type EncryptedAppServiceSecrets } from "@/lib/appServiceCrypto";
import type {
  ActivationCodeVerifyPayload,
  AppActivationRequestPayload,
  PendingActivationApprovePayload,
} from "@/lib/digitalHumanOpsValidation";
import { getSystemSettings } from "@/lib/systemSettingsStore";
import type { UserRecord } from "@/lib/userStore";

type AppDeviceRow = {
  digital_human_id: string;
  device_code: string;
};

export type AppRolePackage = {
  version: {
    id: string | null;
    versionNo: number | null;
    updatedAt: string | null;
  };
  service: {
    dashscopeApiKey: string;
    llmApiKey: string;
    asrApiKey: string;
    ttsApiKey: string;
    encryptedServiceSecrets: EncryptedAppServiceSecrets | null;
    baseUrl: string;
    llmModel: string;
    asrModel: string;
    ttsModel: string;
    ttsVoice: string;
  };
  role: {
    id: string;
    code: string;
    name: string;
    assistantName: string;
    sceneType: string;
    status: string;
    description: string;
    live2dModelPath: string;
    systemPrompt: string;
    prefixPrompt: string;
    openingMessage: string;
    openingMessages: string[];
    knowledgeBaseIndexId: string;
    wakeWordEnabled: boolean;
    wakeWordText: string;
    wakeWords: string[];
    interruptWords: string[];
  };
  interaction: {
    standbyCommands: string[];
    fallbackMessages: string[];
  };
  content: {
    fixedQaItems: Array<{
      id: string;
      question: string;
      answer: string;
      status: "enabled" | "pending" | "disabled";
    }>;
    faqItems: Array<{
      id: string;
      question: string;
      answer: string;
      status: "enabled" | "pending" | "disabled";
    }>;
    hotwordGroups: Array<{
      id: string;
      name: string;
      words: string[];
      type: "business" | "campaign" | "sensitive";
      enabled: boolean;
    }>;
  };
};

export type AppActivateResponse = {
  success: true;
  digitalHumanId: string;
  activation: ReturnType<typeof verifyActivationCode>["activation"];
  device: DeviceBinding | null;
  rolePackage: AppRolePackage;
};

export type AppConfigResponse = {
  success: true;
  digitalHumanId: string;
  device: DeviceBinding | null;
  rolePackage: AppRolePackage;
};

export type AppActivationRequestResponse = {
  success: true;
  status: "pending" | "approved";
  request: ReturnType<typeof registerPendingActivationRequest>;
  digitalHumanId?: string;
  device?: DeviceBinding | null;
  rolePackage?: AppRolePackage;
};

export type AppActivationStatusResponse =
  | {
      success: true;
      status: "pending";
      request: ReturnType<typeof registerPendingActivationRequest>;
    }
  | {
      success: true;
      status: "approved";
      request: ReturnType<typeof registerPendingActivationRequest>;
      digitalHumanId: string;
      device: DeviceBinding | null;
      rolePackage: AppRolePackage;
    };

export function activateAndBuildAppPayload(payload: ActivationCodeVerifyPayload): AppActivateResponse {
  const verified = verifyActivationCode(payload);
  return {
    success: true,
    digitalHumanId: verified.digitalHumanId,
    activation: verified.activation,
    device: verified.device,
    rolePackage: buildAppRolePackage(verified.digitalHumanId, verified.activation.activationCode, payload.deviceCode),
  };
}

export function getAppConfigByDeviceCode(deviceCode: string): AppConfigResponse {
  const normalizedDeviceCode = deviceCode.trim();
  if (!normalizedDeviceCode) {
    throw new Error("deviceCode 不能为空");
  }

  const row = getDigitalHumanDb()
    .prepare(`
      select digital_human_id, device_code
      from digital_human_devices
      where device_code = ?
      order by datetime(updated_at) desc
      limit 1
    `)
    .get(normalizedDeviceCode) as AppDeviceRow | undefined;

  if (!row) {
    throw new Error("设备未绑定角色，请先完成激活");
  }

  return {
    success: true,
    digitalHumanId: row.digital_human_id,
    device: getDevices(row.digital_human_id).devices.find((item) => item.deviceCode === row.device_code) ?? null,
    rolePackage: buildAppRolePackage(row.digital_human_id, findActivationCodeByDeviceCode(normalizedDeviceCode), normalizedDeviceCode),
  };
}

export function requestAppActivation(payload: AppActivationRequestPayload): AppActivationRequestResponse {
  const request = registerPendingActivationRequest(payload);
  if (request.status === "approved" && request.digitalHumanId) {
    return {
      success: true,
      status: "approved",
      request,
      digitalHumanId: request.digitalHumanId,
      device: getDevices(request.digitalHumanId).devices.find((item) => item.deviceCode === request.deviceCode) ?? null,
      rolePackage: buildAppRolePackage(request.digitalHumanId, request.activationCode, request.deviceCode),
    };
  }
  return {
    success: true,
    status: "pending",
    request,
  };
}

export function getAppActivationStatus(deviceCode: string): AppActivationStatusResponse {
  const request = findPendingActivationRequestByDeviceCode(deviceCode);
  if (!request) {
    throw new Error("设备尚未发起激活申请");
  }
  if (request.status === "approved" && request.digitalHumanId) {
    return {
      success: true,
      status: "approved",
      request,
      digitalHumanId: request.digitalHumanId,
      device: getDevices(request.digitalHumanId).devices.find((item) => item.deviceCode === request.deviceCode) ?? null,
      rolePackage: buildAppRolePackage(request.digitalHumanId, request.activationCode, request.deviceCode),
    };
  }
  return {
    success: true,
    status: "pending",
    request,
  };
}

export function approveAppPendingActivation(
  requestId: string,
  payload: PendingActivationApprovePayload,
  approver: Pick<UserRecord, "id" | "username" | "role" | "deviceQuota">,
) {
  if (approver.role === "admin") {
    const quota = Math.max(0, approver.deviceQuota);
    const usedCount = countActiveDevicesApprovedByUser(approver.id);
    if (quota <= 0) {
      throw new Error("当前管理员尚未获得终端激活授权，请联系超级管理员分配额度");
    }
    if (usedCount >= quota) {
      throw new Error(`当前管理员可激活终端上限为 ${quota} 台，已达到授权额度`);
    }
  }
  const approvedRequest = approvePendingActivationRequest(requestId, payload, {
    id: approver.id,
    username: approver.username,
  });
  if (!approvedRequest.digitalHumanId) {
    throw new Error("待激活请求缺少目标角色");
  }
  return {
    success: true,
    request: approvedRequest,
    digitalHumanId: approvedRequest.digitalHumanId,
    device: getDevices(approvedRequest.digitalHumanId).devices.find((item) => item.deviceCode === approvedRequest.deviceCode) ?? null,
    rolePackage: buildAppRolePackage(approvedRequest.digitalHumanId, approvedRequest.activationCode, approvedRequest.deviceCode),
  };
}

export function buildAppRolePackage(
  digitalHumanId: string,
  activationCode = "",
  deviceCode = "",
): AppRolePackage {
  const human = getDigitalHuman(digitalHumanId);
  if (!human) {
    throw new Error("角色不存在");
  }

  const version = getCurrentConfigVersion(digitalHumanId);
  const config = version?.config;
  const interaction = getInteractionSettings(digitalHumanId);
  const fixedQa = getFixedQa(digitalHumanId);
  const faq = getFaq(digitalHumanId);
  const hotwords = getHotwords(digitalHumanId);
  const systemSettings = getSystemSettings();
  const llmApiKey = systemSettings.appLlmApiKey || systemSettings.appDashscopeApiKey || config?.dashscopeApiKey || "";
  const asrApiKey = systemSettings.appAsrApiKey || systemSettings.appDashscopeApiKey || config?.dashscopeApiKey || "";
  const ttsApiKey = systemSettings.appTtsApiKey || systemSettings.appDashscopeApiKey || config?.dashscopeApiKey || "";
  const dashscopeApiKey = systemSettings.appDashscopeApiKey || config?.dashscopeApiKey || "";
  const encryptedServiceSecrets = activationCode.trim() && deviceCode.trim()
    ? encryptAppServiceSecrets(deviceCode, activationCode, {
        dashscopeApiKey,
        llmApiKey,
        asrApiKey,
        ttsApiKey,
      })
    : null;

  const selectedFixedQaIds = new Set(config?.selectedFixedQaIds ?? []);
  const fixedQaItems = fixedQa.items.filter((item) => {
    if (item.status !== "enabled") return false;
    if (!selectedFixedQaIds.size) return false;
    return selectedFixedQaIds.has(item.id);
  });

  return {
    version: {
      id: version?.id ?? null,
      versionNo: version?.versionNo ?? null,
      updatedAt: version?.updatedAt ?? null,
    },
    service: {
      dashscopeApiKey: "",
      llmApiKey: "",
      asrApiKey: "",
      ttsApiKey: "",
      encryptedServiceSecrets,
      baseUrl: systemSettings.appBaseUrl || config?.baseUrl || "",
      llmModel: config?.llmModel ?? "",
      asrModel: config?.asrModel ?? "",
      ttsModel: config?.ttsModel ?? "",
      ttsVoice: config?.ttsVoice ?? "",
    },
    role: {
      id: human.id,
      code: human.code,
      name: human.name,
      assistantName: human.assistantName,
      sceneType: human.sceneType,
      status: human.status,
      description: human.description,
      live2dModelPath: config?.live2dModelPath ?? "",
      systemPrompt: config?.systemPrompt ?? "",
      prefixPrompt: config?.prefixPrompt ?? "",
      openingMessage: config?.openingMessage ?? interaction.openingMessages[0] ?? "",
      openingMessages: interaction.openingMessages,
      knowledgeBaseIndexId: config?.knowledgeBaseIndexId ?? "",
      wakeWordEnabled: config?.wakeWordEnabled ?? true,
      wakeWordText: config?.wakeWordText ?? interaction.wakeWords[0] ?? "",
      wakeWords: interaction.wakeWords,
      interruptWords: interaction.interruptWords,
    },
    interaction: {
      standbyCommands: interaction.standbyCommands,
      fallbackMessages: interaction.fallbackMessages,
    },
    content: {
      fixedQaItems,
      faqItems: faq.items.filter((item) => item.status === "enabled"),
      hotwordGroups: hotwords.groups.filter((group) => group.enabled),
    },
  };
}
