import { ok } from "@/lib/api";
import { getConfigStatus } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return ok(getConfigStatus());
}
