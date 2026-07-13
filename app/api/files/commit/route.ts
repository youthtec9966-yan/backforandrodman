import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { addFile } from "@/lib/bailian/fileService";

export const runtime = "nodejs";

const schema = z.object({
  leaseId: z.string().min(1),
  categoryId: z.string().optional().default("default"),
  parser: z.string().optional().default("DASHSCOPE_DOCMIND"),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const body: any = await addFile(input.leaseId, input.categoryId, input.parser);
    const data = body.Data ?? body.data ?? {};

    return ok({
      requestId: body.RequestId ?? body.requestId,
      fileId: data.FileId ?? data.fileId,
      raw: body,
    });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
