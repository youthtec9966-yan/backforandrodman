import { NextResponse } from "next/server";
import { normalizeBailianError } from "@/lib/bailian/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: unknown, init?: ResponseInit) {
  const normalized = normalizeBailianError(error);
  const status = init?.status ?? normalized.httpStatus ?? 500;

  return NextResponse.json(
    {
      ok: false,
      error: normalized,
    },
    { ...init, status },
  );
}
