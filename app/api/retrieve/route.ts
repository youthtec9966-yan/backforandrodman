import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { retrieve } from "@/lib/bailian/knowledgeBaseService";

export const runtime = "nodejs";

const schema = z.object({
  indexId: z.string().min(1),
  query: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const body: any = await retrieve(input.indexId, input.query);
    const data = body.Data ?? body.data ?? {};

    return ok({
      requestId: body.RequestId ?? body.requestId,
      nodes: data.Nodes ?? data.nodes ?? [],
      raw: body,
    });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
