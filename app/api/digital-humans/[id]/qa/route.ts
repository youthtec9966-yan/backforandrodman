import { fail, ok } from "@/lib/api";
import { getFixedQa, saveFixedQa } from "@/lib/digitalHumanOpsStore";
import { qaPayloadSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(getFixedQa(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = qaPayloadSchema.parse(await request.json());
    return ok(saveFixedQa(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
