import { fail, ok } from "@/lib/api";
import { getFaq, saveFaq } from "@/lib/digitalHumanOpsStore";
import { qaPayloadSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(getFaq(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = qaPayloadSchema.parse(await request.json());
    return ok(saveFaq(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
