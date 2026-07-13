import { fail, ok } from "@/lib/api";
import { requestAppActivation } from "@/lib/appDeviceService";
import { appActivationRequestSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = appActivationRequestSchema.parse(await request.json());
    return ok(requestAppActivation(payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
