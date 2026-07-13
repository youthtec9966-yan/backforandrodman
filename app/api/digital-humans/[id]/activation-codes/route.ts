import { fail, ok } from "@/lib/api";
import { createActivationCode, listActivationCodes } from "@/lib/digitalHumanOpsStore";
import { activationCodeCreateSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(listActivationCodes(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = activationCodeCreateSchema.parse(await request.json());
    return ok(createActivationCode(id, payload), { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
