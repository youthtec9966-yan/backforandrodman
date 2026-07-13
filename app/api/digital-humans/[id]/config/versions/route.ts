import { fail, ok } from "@/lib/api";
import { getDigitalHuman, listConfigVersions } from "@/lib/digitalHumanStore";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const human = getDigitalHuman(id);
    if (!human) {
      return fail("Digital human not found", { status: 404 });
    }
    return ok({
      digitalHuman: human,
      versions: listConfigVersions(id),
    });
  } catch (error) {
    return fail(error);
  }
}
