import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { approveAppPendingActivation } from "@/lib/appDeviceService";
import { ensureUserRole, getSessionUserFromRequest } from "@/lib/auth/server";
import { pendingActivationApproveSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const sessionUser = await getSessionUserFromRequest(request);
    if (!sessionUser || !ensureUserRole(sessionUser, ["super_admin", "admin"])) {
      return NextResponse.json({ ok: false, error: { message: "无权审批待激活设备" } }, { status: 403 });
    }
    const { requestId } = await context.params;
    const payload = pendingActivationApproveSchema.parse(await request.json());
    return ok(approveAppPendingActivation(requestId, payload, sessionUser));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
