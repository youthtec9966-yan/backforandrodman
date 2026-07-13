export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const DEFAULT_AUTH_SECRET = "dev-only-change-me-auth-secret";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: "super_admin" | "admin" | "operator";
  iat: number;
  exp: number;
};

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

export function getAuthSecret() {
  return process.env.AUTH_JWT_SECRET?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()
    || DEFAULT_AUTH_SECRET;
}

export async function signAuthToken(payload: Omit<AuthTokenPayload, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const body: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + AUTH_TOKEN_TTL_SECONDS,
  };
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const signingInput = `${encodeJson(header)}.${encodeJson(body)}`;
  const signature = await hmacSha256(signingInput, getAuthSecret());
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

export async function verifyAuthToken(token: string | undefined | null) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expected = bytesToBase64Url(await hmacSha256(`${encodedHeader}.${encodedPayload}`, getAuthSecret()));
  if (!constantTimeEqual(encodedSignature, expected)) return null;

  try {
    const header = JSON.parse(decodeBase64UrlToText(encodedHeader)) as JwtHeader;
    const payload = JSON.parse(decodeBase64UrlToText(encodedPayload)) as AuthTokenPayload;
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    if (!payload.sub || !payload.username || !payload.role || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function encodeJson(value: unknown) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function hmacSha256(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input)));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64UrlToText(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
