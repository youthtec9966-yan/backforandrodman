import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { ensureUserRole, getSessionUserFromRequest } from "@/lib/auth/server";
import { getSystemSettings, updateSystemSettings } from "@/lib/systemSettingsStore";

export const runtime = "nodejs";

const schema = z.object({
  alibabaCloudAccessKeyId: z.string().optional(),
  alibabaCloudAccessKeySecret: z.string().optional(),
  bailianWorkspaceId: z.string().optional(),
  bailianEndpoint: z.string().optional(),
  authJwtSecret: z.string().optional(),
  cookieSecure: z.boolean().optional(),
  appDashscopeApiKey: z.string().optional(),
  appLlmApiKey: z.string().optional(),
  appAsrApiKey: z.string().optional(),
  appTtsApiKey: z.string().optional(),
  appBaseUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!ensureUserRole(user, ["super_admin"])) {
      return fail("仅超级管理员可查看系统密钥配置", { status: 403 });
    }
    return ok(getSystemSettings());
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!ensureUserRole(user, ["super_admin"])) {
      return fail("仅超级管理员可修改系统密钥配置", { status: 403 });
    }
    const input = schema.parse(await request.json());
    return ok(updateSystemSettings(input));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
