import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { applyFileUploadLease } from "@/lib/bailian/fileService";
import { validateDocumentFile } from "@/lib/validation";

export const runtime = "nodejs";

const schema = z.object({
  fileName: z.string().min(1),
  md5: z.string().min(16),
  sizeInBytes: z.union([z.string(), z.number()]).transform((value) => String(value)),
  categoryId: z.string().optional().default("default"),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const validation = validateDocumentFile(input.fileName, Number(input.sizeInBytes));

    if (!validation.valid) {
      return fail(validation.message ?? "Invalid file", { status: 400 });
    }

    return ok(await applyFileUploadLease(input));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
