import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/jwt";

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/activation-codes/verify",
]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PATHS.has(pathname) || pathname.startsWith("/api/app/");
  const session = await verifyAuthToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL(session.role === "super_admin" ? "/super-admin" : "/workspace", request.url));
  }

  if (session || isLoginPage || isPublicApi) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      { ok: false, error: { message: "未登录或登录已失效" } },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|standalone-assets|.*\\..*).*)"],
};
