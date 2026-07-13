import { fail, ok } from "@/lib/api";
import { advanceTask } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await context.params;
    const task = await advanceTask(taskId);

    if (!task) {
      return fail("Task not found", { status: 404 });
    }

    return ok(task);
  } catch (error) {
    return fail(error);
  }
}
