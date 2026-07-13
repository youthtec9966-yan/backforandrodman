import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { ensureUserRole, getSessionUserFromRequest } from "@/lib/auth/server";
import { countActiveDevicesApprovedByUser } from "@/lib/digitalHumanOpsStore";
import { createUser, listUsers } from "@/lib/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!ensureUserRole(sessionUser, ["super_admin"])) {
      return NextResponse.json({ ok: false, error: { message: "仅超级管理员可查看账号列表" } }, { status: 403 });
    }
    return ok(listUsers().map((user) => ({
      ...user,
      activatedDeviceCount: user.role === "admin" ? countActiveDevicesApprovedByUser(user.id) : 0,
    })));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!ensureUserRole(sessionUser, ["super_admin"])) {
      return NextResponse.json({ ok: false, error: { message: "仅超级管理员可创建管理员账号" } }, { status: 403 });
    }
    const body = await request.json();
    return ok(createUser({
      username: readString(body.username),
      password: readString(body.password),
      displayName: readString(body.displayName),
      role: body.role === "admin" ? "admin" : "operator",
      status: body.status === "disabled" ? "disabled" : "enabled",
      deviceQuota: readNumber(body.deviceQuota),
    }), { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
