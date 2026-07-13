import { fail, ok } from "@/lib/api";
import { getAppConfigByDeviceCode } from "@/lib/appDeviceService";
import { appDeviceConfigSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = appDeviceConfigSchema.parse(await request.json());
    return ok(getAppConfigByDeviceCode(payload.deviceCode));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
