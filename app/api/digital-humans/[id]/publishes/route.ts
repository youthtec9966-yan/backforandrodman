import { fail, ok } from "@/lib/api";
import { createPublish, listPublishes } from "@/lib/digitalHumanOpsStore";
import { publishCreateSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(listPublishes(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = publishCreateSchema.parse(await request.json());
    return ok(createPublish(id, payload), { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
