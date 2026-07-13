export type NormalizedError = {
  message: string;
  code?: string;
  requestId?: string;
  httpStatus?: number;
  details?: unknown;
};

export function normalizeBailianError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: string;
      statusCode?: number;
      data?: unknown;
      response?: { status?: number; data?: unknown };
    };
    const body = extractBody(candidate.data ?? candidate.response?.data);

    return {
      message: body.message ?? error.message,
      code: body.code ?? candidate.code,
      requestId: body.requestId,
      httpStatus: body.httpStatus ?? candidate.statusCode ?? candidate.response?.status,
      details: body.details ?? candidate.data ?? candidate.response?.data,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  const body = extractBody(error);
  return {
    message: body.message ?? "Unexpected server error",
    code: body.code,
    requestId: body.requestId,
    httpStatus: body.httpStatus,
    details: body.details ?? error,
  };
}

function extractBody(input: unknown) {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  const nested = (obj.body && typeof obj.body === "object" ? obj.body : obj) as Record<string, unknown>;

  return {
    message: readString(nested.Message) ?? readString(nested.message),
    code: readString(nested.Code) ?? readString(nested.code),
    requestId: readString(nested.RequestId) ?? readString(nested.requestId),
    httpStatus: readStatus(nested.Status) ?? readStatus(nested.status) ?? readStatus(nested.statusCode),
    details: input,
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStatus(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
