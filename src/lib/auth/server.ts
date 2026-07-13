import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/jwt";
import { getUser, type UserRecord, type UserRole } from "@/lib/userStore";

export async function getSessionFromRequest(request: Request) {
  return verifyAuthToken(readCookie(request.headers.get("cookie"), AUTH_COOKIE_NAME));
}

export async function getSessionUserFromRequest(request: Request) {
  const session = await getSessionFromRequest(request);
  const user = session ? getUser(session.sub) : null;
  return user && user.status === "enabled" ? user : null;
}

export function ensureUserRole(user: UserRecord | null, roles: UserRole[]) {
  return !!user && roles.includes(user.role);
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const match = cookies.find((item) => item.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}
