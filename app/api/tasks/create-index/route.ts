import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { scheduleTaskAdvance } from "@/lib/tasks";
import { createTask } from "@/lib/taskStore";

export const runtime = "nodejs";

const schema = z.object({
  fileId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const task = createTask("create-index", {
      ...input,
      structureType: "unstructured",
      sourceType: "DATA_CENTER_FILE",
      sinkType: "DEFAULT",
    });
    scheduleTaskAdvance(task.id);
    return ok(task, { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
