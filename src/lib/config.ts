import { getSystemSettings } from "@/lib/systemSettingsStore";

export type AppConfigStatus = {
  ready: boolean;
  endpoint: string;
  workspaceIdMasked: string | null;
  missing: string[];
};

const DEFAULT_ENDPOINT = "bailian.cn-beijing.aliyuncs.com";

export function getBailianConfig() {
  const settings = getSystemSettings();
  return {
    accessKeyId: settings.alibabaCloudAccessKeyId,
    accessKeySecret: settings.alibabaCloudAccessKeySecret,
    workspaceId: settings.bailianWorkspaceId,
    endpoint: settings.bailianEndpoint || DEFAULT_ENDPOINT,
  };
}

export function getConfigStatus(): AppConfigStatus {
  const config = getBailianConfig();
  const missing = [
    ["ALIBABA_CLOUD_ACCESS_KEY_ID", config.accessKeyId],
    ["ALIBABA_CLOUD_ACCESS_KEY_SECRET", config.accessKeySecret],
    ["BAILIAN_WORKSPACE_ID", config.workspaceId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    ready: missing.length === 0,
    endpoint: config.endpoint,
    workspaceIdMasked: config.workspaceId ? maskValue(config.workspaceId) : null,
    missing,
  };
}

export function assertBailianConfig() {
  const config = getBailianConfig();
  const status = getConfigStatus();

  if (!status.ready) {
    throw new Error(`Missing Bailian config: ${status.missing.join(", ")}`);
  }

  return config;
}

export function maskValue(value: string) {
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
