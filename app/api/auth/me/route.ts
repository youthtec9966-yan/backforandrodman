import { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth/server";
import { getUser } from "@/lib/userStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const user = session ? getUser(session.sub) : null;

  if (!user || user.status !== "enabled") {
    return NextResponse.json(
      { ok: false, error: { message: "未登录或登录已失效" } },
      { status: 401 },
    );
  }

  return ok(user);
}
