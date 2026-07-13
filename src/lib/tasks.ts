import { normalizeBailianError } from "@/lib/bailian/errors";
import {
  deleteIndexDocument,
  describeFile,
  submitIndexAddDocumentsJob,
} from "@/lib/bailian/fileService";
import {
  createIndex,
  getIndexJobStatus,
  submitIndexJob,
} from "@/lib/bailian/knowledgeBaseService";
import { getTask, TaskRecord, updateTask } from "@/lib/taskStore";

const PARSING_STATUSES = new Set(["INIT", "PARSING"]);
const PARSE_SUCCESS = "PARSE_SUCCESS";
const JOB_RUNNING_STATUSES = new Set(["PENDING", "RUNNING", "PROCESSING"]);
const JOB_SUCCESS = "COMPLETED";

export async function advanceTask(taskId: string) {
  const task = getTask(taskId);
  if (!task) return null;
  if (task.status !== "running") return task;

  try {
    if (task.stage === "waiting_file_parse") {
      return await advanceFileParse(task);
    }

    if (task.stage === "waiting_index_job") {
      return await advanceIndexJob(task);
    }

    return task;
  } catch (error) {
    const normalized = normalizeBailianError(error);
    return updateTask(task.id, {
      status: "failed",
      stage: "failed",
      error: normalized.message,
      requestId: normalized.requestId ?? task.requestId,
      result: { error: normalized },
    });
  }
}

export function scheduleTaskAdvance(taskId: string) {
  setTimeout(() => {
    void advanceTask(taskId).catch((error) => {
      const normalized = normalizeBailianError(error);
      updateTask(taskId, {
        status: "failed",
        stage: "failed",
        error: normalized.message,
        requestId: normalized.requestId ?? null,
        result: { error: normalized },
      });
    });
  }, 0);
}

async function advanceFileParse(task: TaskRecord) {
  if (!task.fileId) {
    throw new Error("Task is missing fileId");
  }

  const fileBody: any = await describeFile(task.fileId);
  const data = fileBody.Data ?? fileBody.data ?? {};
  const fileStatus = data.Status ?? data.status;
  const requestId = fileBody.RequestId ?? fileBody.requestId ?? task.requestId;

  if (PARSING_STATUSES.has(fileStatus)) {
    return updateTask(task.id, {
      requestId,
      result: {
        ...(task.result ?? {}),
        fileStatus,
        file: data,
      },
    });
  }

  if (fileStatus !== PARSE_SUCCESS) {
    return updateTask(task.id, {
      status: "failed",
      stage: "failed",
      error: `File parse ended with status ${fileStatus || "UNKNOWN"}`,
      requestId,
      result: {
        ...(task.result ?? {}),
        fileStatus,
        file: data,
      },
    });
  }

  if (task.kind === "create-index") {
    return await startCreateIndexJob(task, requestId);
  }

  return await startAddDocumentsJob(task, requestId);
}

async function startCreateIndexJob(task: TaskRecord, requestId: string | null) {
  const payload = task.payload as {
    fileId: string;
    name: string;
    description?: string;
    structureType?: string;
    sourceType?: string;
    sinkType?: string;
  };

  updateTask(task.id, { stage: "creating_index", requestId });
  const indexBody: any = await createIndex(payload);
  const indexData = indexBody.Data ?? indexBody.data ?? {};
  const indexId = indexData.Id ?? indexData.id;

  if (!indexId) {
    throw new Error("CreateIndex did not return an index id");
  }

  updateTask(task.id, {
    stage: "submitting_index_job",
    indexId,
    requestId: indexBody.RequestId ?? indexBody.requestId ?? requestId,
  });
  const submitBody: any = await submitIndexJob(indexId);
  const submitData = submitBody.Data ?? submitBody.data ?? {};
  const jobId = submitData.Id ?? submitData.id;

  if (!jobId) {
    throw new Error("SubmitIndexJob did not return a job id");
  }

  return updateTask(task.id, {
    stage: "waiting_index_job",
    indexId,
    jobId,
    requestId: submitBody.RequestId ?? submitBody.requestId ?? requestId,
    result: {
      ...(task.result ?? {}),
      index: indexData,
      submit: submitData,
    },
  });
}

async function startAddDocumentsJob(task: TaskRecord, requestId: string | null) {
  if (!task.indexId || !task.fileId) {
    throw new Error("Task is missing indexId or fileId");
  }

  updateTask(task.id, { stage: "submitting_add_documents_job", requestId });
  const body: any = await submitIndexAddDocumentsJob(task.indexId, task.fileId);
  const data = body.Data ?? body.data ?? {};
  const jobId = data.Id ?? data.id;

  if (!jobId) {
    throw new Error("SubmitIndexAddDocumentsJob did not return a job id");
  }

  return updateTask(task.id, {
    stage: "waiting_index_job",
    jobId,
    requestId: body.RequestId ?? body.requestId ?? requestId,
    result: {
      ...(task.result ?? {}),
      submit: data,
    },
  });
}

async function advanceIndexJob(task: TaskRecord) {
  if (!task.indexId || !task.jobId) {
    throw new Error("Task is missing indexId or jobId");
  }

  const body: any = await getIndexJobStatus(task.indexId, task.jobId);
  const data = body.Data ?? body.data ?? {};
  const jobStatus = data.Status ?? data.status;
  const requestId = body.RequestId ?? body.requestId ?? task.requestId;

  if (JOB_RUNNING_STATUSES.has(jobStatus)) {
    return updateTask(task.id, {
      requestId,
      result: {
        ...(task.result ?? {}),
        jobStatus,
        job: data,
      },
    });
  }

  if (jobStatus !== JOB_SUCCESS) {
    return updateTask(task.id, {
      status: "failed",
      stage: "failed",
      error: `Index job ended with status ${jobStatus || "UNKNOWN"}`,
      requestId,
      result: {
        ...(task.result ?? {}),
        jobStatus,
        job: data,
      },
    });
  }

  const payload = task.payload as { oldFileId?: string };
  if (task.kind === "add-documents" && payload.oldFileId && task.indexId) {
    updateTask(task.id, { stage: "deleting_old_document", requestId });
    await deleteIndexDocument(task.indexId, payload.oldFileId);
  }

  return updateTask(task.id, {
    status: "completed",
    stage: "completed",
    requestId,
    result: {
      ...(task.result ?? {}),
      jobStatus,
      job: data,
      completedAt: new Date().toISOString(),
    },
  });
}
