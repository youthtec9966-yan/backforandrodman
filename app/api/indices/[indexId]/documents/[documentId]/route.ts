import { fail, ok } from "@/lib/api";
import { deleteIndexDocument } from "@/lib/bailian/fileService";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ indexId: string; documentId: string }> },
) {
  try {
    const { indexId, documentId } = await context.params;
    return ok(await deleteIndexDocument(indexId, documentId));
  } catch (error) {
    return fail(error);
  }
}
