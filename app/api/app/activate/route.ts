import { fail, ok } from "@/lib/api";
import { activateAndBuildAppPayload } from "@/lib/appDeviceService";
import { activationCodeVerifySchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = activationCodeVerifySchema.parse(await request.json());
    return ok(activateAndBuildAppPayload(payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
