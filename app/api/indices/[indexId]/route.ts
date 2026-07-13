import { fail, ok } from "@/lib/api";
import { deleteIndex } from "@/lib/bailian/knowledgeBaseService";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ indexId: string }> }) {
  try {
    const { indexId } = await context.params;
    return ok(await deleteIndex(indexId));
  } catch (error) {
    return fail(error);
  }
}
