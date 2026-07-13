import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { scheduleTaskAdvance } from "@/lib/tasks";
import { createTask } from "@/lib/taskStore";

export const runtime = "nodejs";

const schema = z.object({
  indexId: z.string().min(1),
  fileId: z.string().min(1),
  oldFileId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const task = createTask("add-documents", input);
    scheduleTaskAdvance(task.id);
    return ok(task, { status: 201 });
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
