import { bailianModels, createBailianClient, getWorkspaceId } from "@/lib/bailian/client";
import { assertSuccess, normalizeHeaders, unwrapBody } from "@/lib/bailian/utils";

const Util = require("@alicloud/tea-util");

export type FileLeaseInput = {
  fileName: string;
  md5: string;
  sizeInBytes: string;
  categoryId?: string;
};

export async function applyFileUploadLease(input: FileLeaseInput) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const categoryId = input.categoryId || "default";
  const request = new bailianModels.ApplyFileUploadLeaseRequest({
    fileName: input.fileName,
    md5: input.md5,
    sizeInBytes: input.sizeInBytes,
  });
  const response = await client.applyFileUploadLeaseWithOptions(
    categoryId,
    workspaceId,
    request,
    {},
    new Util.RuntimeOptions({}),
  );
  const body = assertSuccess(unwrapBody<any>(response));
  const param = body?.Data?.Param ?? body?.data?.param ?? {};

  return {
    raw: body,
    leaseId: body?.Data?.FileUploadLeaseId ?? body?.data?.fileUploadLeaseId,
    method: param.Method ?? param.method ?? "PUT",
    url: param.Url ?? param.url,
    headers: normalizeHeaders(param.Headers ?? param.headers),
    categoryId,
    requestId: body?.RequestId ?? body?.requestId,
  };
}

export async function addFile(leaseId: string, categoryId = "default", parser = "DASHSCOPE_DOCMIND") {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.AddFileRequest({
    leaseId,
    parser,
    categoryId,
  });
  const response = await client.addFileWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function describeFile(fileId: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.DescribeFileRequest();
  const response = await client.describeFileWithOptions(workspaceId, fileId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function listIndexDocuments(indexId: string, pageNumber = 1, pageSize = 100) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.ListIndexDocumentsRequest({
    indexId,
    pageNumber,
    pageSize,
  });
  const response = await client.listIndexDocumentsWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}

export async function submitIndexAddDocumentsJob(indexId: string, fileId: string, sourceType = "DATA_CENTER_FILE") {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.SubmitIndexAddDocumentsJobRequest({
    indexId,
    documentIds: [fileId],
    sourceType,
  });
  const response = await client.submitIndexAddDocumentsJobWithOptions(
    workspaceId,
    request,
    {},
    new Util.RuntimeOptions({}),
  );
  return assertSuccess(unwrapBody(response));
}

export async function deleteIndexDocument(indexId: string, fileId: string) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();
  const request = new bailianModels.DeleteIndexDocumentRequest({
    indexId,
    documentIds: [fileId],
  });
  const response = await client.deleteIndexDocumentWithOptions(workspaceId, request, {}, new Util.RuntimeOptions({}));
  return assertSuccess(unwrapBody(response));
}
