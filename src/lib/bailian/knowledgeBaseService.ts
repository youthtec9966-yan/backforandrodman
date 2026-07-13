import { bailianModels, createBailianClient, getWorkspaceId } from "@/lib/bailian/client";
import { assertSuccess, unwrapBody } from "@/lib/bailian/utils";

const Util = require("@alicloud/tea-util");

export type CreateIndexInput = {
  fileId: string;
  name: string;
  description?: string;
  structureType?: string;
  sourceType?: string;
  sinkType?: string;
};

export type UpdateIndexInput = {
  indexId: string;
  name?: string;
  description?: string;
};

export async function listIndices() {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.ListIndicesRequest();
  const response = await client.listIndicesWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function retrieve(indexId: string, query: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.RetrieveRequest({ indexId, query });
  const response = await client.retrieveWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function createIndex(input: CreateIndexInput) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.CreateIndexRequest({
    name: input.name,
    description: input.description,
    structureType: input.structureType ?? "unstructured",
    documentIds: [input.fileId],
    sourceType: input.sourceType ?? "DATA_CENTER_FILE",
    sinkType: input.sinkType ?? "DEFAULT",
  });
  const response = await client.createIndexWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function submitIndexJob(indexId: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.SubmitIndexJobRequest({ indexId });
  const response = await client.submitIndexJobWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function getIndexJobStatus(indexId: string, jobId: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.GetIndexJobStatusRequest({ indexId, jobId });
  const response = await client.getIndexJobStatusWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function deleteIndex(indexId: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.DeleteIndexRequest({ indexId });
  const response = await client.deleteIndexWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function updateIndex(input: UpdateIndexInput) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.UpdateIndexRequest(input);
  const response = await client.updateIndexWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}
