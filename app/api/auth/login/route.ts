import { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { AUTH_COOKIE_NAME, AUTH_TOKEN_TTL_SECONDS, signAuthToken } from "@/lib/auth/jwt";
import { getSystemSettings } from "@/lib/systemSettingsStore";
import { authenticateUser } from "@/lib/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = authenticateUser(username, password);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { message: "用户名或密码错误" } },
      { status: 401 },
    );
  }

  const token = await signAuthToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  const isSecure = getSystemSettings().cookieSecure;

  const response = NextResponse.json({ ok: true, data: user });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  });
  return response;
}
