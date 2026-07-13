import { fail, ok } from "@/lib/api";
import { listPendingActivationRequests } from "@/lib/digitalHumanOpsStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(listPendingActivationRequests());
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
