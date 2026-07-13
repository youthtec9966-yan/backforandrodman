import { fail, ok } from "@/lib/api";
import { getInteractionSettings, saveInteractionSettings } from "@/lib/digitalHumanOpsStore";
import { interactionPayloadSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(getInteractionSettings(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = interactionPayloadSchema.parse(await request.json());
    return ok(saveInteractionSettings(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
