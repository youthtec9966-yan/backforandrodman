import { fail, ok } from "@/lib/api";
import { createDigitalHuman, listDigitalHumans, saveConfigVersion } from "@/lib/digitalHumanStore";
import { saveFixedQa, saveInteractionSettings } from "@/lib/digitalHumanOpsStore";
import { digitalHumanCreateWithConfigSchema } from "@/lib/digitalHumanValidation";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(listDigitalHumans());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = digitalHumanCreateWithConfigSchema.parse(await request.json());
    const human = createDigitalHuman(input);
    if (input.initialConfig) {
      saveConfigVersion(human.id, input.initialConfig);
    }
    if (input.initialInteraction) {
      saveInteractionSettings(human.id, input.initialInteraction);
    }
    if (input.fixedQaItems?.length) {
      saveFixedQa(human.id, {
        items: input.fixedQaItems.map((item) => ({
          id: undefined,
          question: item.question,
          answer: item.answer,
          status: item.status,
        })),
      });
    }
    return ok(human, { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
