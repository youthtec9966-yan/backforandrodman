import { fail, ok } from "@/lib/api";
import { getHotwords, saveHotwords } from "@/lib/digitalHumanOpsStore";
import { hotwordPayloadSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(getHotwords(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = hotwordPayloadSchema.parse(await request.json());
    return ok(saveHotwords(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
