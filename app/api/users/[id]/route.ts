import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { ensureUserRole, getSessionUserFromRequest } from "@/lib/auth/server";
import { deleteUser, updateUser } from "@/lib/userStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item) => typeof item === "string" && item.trim());
  return result;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!ensureUserRole(sessionUser, ["super_admin"])) {
      return NextResponse.json({ ok: false, error: { message: "仅超级管理员可修改账号信息" } }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const user = updateUser(id, {
      password: readOptionalString(body.password),
      displayName: readOptionalString(body.displayName),
      role: body.role === "super_admin" ? "super_admin" : body.role === "admin" ? "admin" : body.role === "operator" ? "operator" : undefined,
      status: body.status === "disabled" ? "disabled" : body.status === "enabled" ? "enabled" : undefined,
      deviceQuota: readOptionalNumber(body.deviceQuota),
      allowedLive2dModelIds: readOptionalStringArray(body.allowedLive2dModelIds),
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: { message: "用户不存在" } }, { status: 404 });
    }
    return ok(user);
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!ensureUserRole(sessionUser, ["super_admin"])) {
      return NextResponse.json({ ok: false, error: { message: "仅超级管理员可删除账号" } }, { status: 403 });
    }
    const { id } = await context.params;
    if (sessionUser?.id === id) {
      return NextResponse.json({ ok: false, error: { message: "不能删除当前登录账号" } }, { status: 400 });
    }
    const user = deleteUser(id);
    if (!user) {
      return NextResponse.json({ ok: false, error: { message: "用户不存在" } }, { status: 404 });
    }
    return ok(user);
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
