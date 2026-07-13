import { fail, ok } from "@/lib/api";
import { listIndices } from "@/lib/bailian/knowledgeBaseService";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listIndices());
  } catch (error) {
    return fail(error);
  }
}
