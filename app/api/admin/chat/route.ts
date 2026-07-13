import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { runChatRouter } from "@/lib/chatRouterService";

export const runtime = "nodejs";

const schema = z.object({
  digitalHumanId: z.string().min(1),
  query: z.string().min(1),
  mode: z.enum(["fixed_qa", "knowledge", "auto"]).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());

    const result = await runChatRouter({
      deviceCode: "admin-debug",
      digitalHumanId: input.digitalHumanId,
      query: input.query,
      stream: false,
      mode: input.mode,
      history: input.history,
    });

    return ok(result);
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
