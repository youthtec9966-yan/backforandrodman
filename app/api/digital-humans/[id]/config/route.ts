import { fail, ok } from "@/lib/api";
import { getCurrentConfigVersion, getDigitalHuman, saveConfigVersion } from "@/lib/digitalHumanStore";
import { digitalHumanConfigSchema } from "@/lib/digitalHumanValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const human = getDigitalHuman(id);
    if (!human) {
      return fail("Digital human not found", { status: 404 });
    }
    const version = getCurrentConfigVersion(id);
    return ok({
      digitalHuman: human,
      configVersion: version,
      config: version?.config ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = digitalHumanConfigSchema.parse(await request.json());
    return ok(saveConfigVersion(id, input), { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
