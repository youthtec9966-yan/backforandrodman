import { assertBailianConfig } from "@/lib/config";

const bailian20231229 = require("@alicloud/bailian20231229");
const bailianModels = require("@alicloud/bailian20231229/dist/models/model");
const OpenApi = require("@alicloud/openapi-client");

export type BailianClient = InstanceType<typeof bailian20231229.default>;

export function createBailianClient(): BailianClient {
  const configValues = assertBailianConfig();
  const config = new OpenApi.Config({
    accessKeyId: configValues.accessKeyId,
    accessKeySecret: configValues.accessKeySecret,
  });

  config.endpoint = configValues.endpoint;
  return new bailian20231229.default(config);
}

export function getWorkspaceId() {
  return assertBailianConfig().workspaceId;
}

export { bailian20231229, bailianModels };
