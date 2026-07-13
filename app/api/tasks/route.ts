import { ok } from "@/lib/api";
import { listTasks } from "@/lib/taskStore";

export const runtime = "nodejs";

export async function GET() {
  return ok(listTasks());
}
