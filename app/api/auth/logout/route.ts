import { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { getSystemSettings } from "@/lib/systemSettingsStore";

export const runtime = "nodejs";

export async function POST() {
  const isSecure = getSystemSettings().cookieSecure;

  const response = NextResponse.json({ ok: true, data: { loggedOut: true } });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  return response;
}

