export function unwrapBody<T = unknown>(response: { body?: T } | T): T {
  if (response && typeof response === "object" && "body" in response) {
    return (response as { body: T }).body;
  }

  return response as T;
}

export function assertSuccess(body: any) {
  const success = body?.Success ?? body?.success;
  const status = String(body?.Status ?? body?.status ?? "");
  const code = body?.Code ?? body?.code;

  if (success === false || (status && status !== "200") || (code && !/^success$/i.test(String(code)))) {
    throw body;
  }

  return body;
}

export function normalizeHeaders(headers: unknown): Record<string, string> {
  if (!headers) return {};
  if (typeof headers === "string") {
    const result: Record<string, string> = {};
    for (const line of headers.split(/\r?\n|,/)) {
      const match = line.match(/"?([^":]+)"?\s*:\s*"?([^"]*)"?/);
      if (match) result[match[1].trim()] = match[2].trim();
    }
    return result;
  }

  if (typeof headers === "object") {
    return Object.fromEntries(
      Object.entries(headers as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string")
        .map(([key, value]) => [key, value as string]),
    );
  }

  return {};
}
