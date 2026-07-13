import { fail, ok } from "@/lib/api";
import { getDigitalHuman, updateDigitalHuman } from "@/lib/digitalHumanStore";
import { deleteDigitalHumanBundle } from "@/lib/digitalHumanOpsStore";
import { digitalHumanUpdateSchema } from "@/lib/digitalHumanValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const record = getDigitalHuman(id);
    if (!record) {
      return fail("Digital human not found", { status: 404 });
    }
    return ok(record);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = digitalHumanUpdateSchema.parse(await request.json());
    const updated = updateDigitalHuman(id, input);
    if (!updated) {
      return fail("Digital human not found", { status: 404 });
    }
    return ok(updated);
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const deleted = deleteDigitalHumanBundle(id);
    if (!deleted) {
      return fail("Digital human not found", { status: 404 });
    }
    return ok({ id, deleted: true });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
