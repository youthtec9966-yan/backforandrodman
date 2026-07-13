import { fail, ok } from "@/lib/api";
import { insertBehaviorEvents } from "@/lib/behaviorEventStore";
import { behaviorEventBatchSchema } from "@/lib/behaviorEventValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = behaviorEventBatchSchema.parse(await request.json());
    const inserted = insertBehaviorEvents(input.events);
    return ok({ inserted });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
