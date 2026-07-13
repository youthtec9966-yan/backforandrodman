import { fail, ok } from "@/lib/api";
import { listIndexDocuments } from "@/lib/bailian/fileService";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ indexId: string }> }) {
  try {
    const { indexId } = await context.params;
    const url = new URL(request.url);
    const pageNumber = Number(url.searchParams.get("pageNumber") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "100");

    return ok(await listIndexDocuments(indexId, pageNumber, pageSize));
  } catch (error) {
    return fail(error);
  }
}
