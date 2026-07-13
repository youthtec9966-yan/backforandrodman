import { fail, ok } from "@/lib/api";
import { deleteActivatedDevice, getDevices, saveDevices } from "@/lib/digitalHumanOpsStore";
import { deviceDeleteSchema, devicePayloadSchema } from "@/lib/digitalHumanOpsValidation";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(getDevices(id));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = devicePayloadSchema.parse(await request.json());
    return ok(saveDevices(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = deviceDeleteSchema.parse(await request.json());
    return ok(deleteActivatedDevice(id, payload));
  } catch (error) {
    return fail(error, { status: 400 });
  }
}
