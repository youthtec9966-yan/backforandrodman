import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import {
  listAllLive2dModels,
  updateLive2dModel,
  deleteLive2dModel,
  importLive2dModel,
  getModelsAllowedForUser,
} from "@/lib/live2dStore";
import { getSessionUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

// 转换为前端所需的 Live2dModelOption 类型
function toModelOption(model: any) {
  return {
    id: model.id,
    name: model.displayName ?? model.name,
    folderName: model.folderName,
    modelPath: model.modelPath,
    previewUrl: model.previewUrl,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return fail("未登录", { status: 401 });
    }

    if (user.role === "super_admin") {
      const models = listAllLive2dModels().map(toModelOption);
      return ok(models);
    }

    const allowed = getModelsAllowedForUser(user.id).map(toModelOption);
    return ok(allowed);
  } catch (e: any) {
    return fail(e.message, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user || user.role !== "super_admin") {
      return fail("权限不足", { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return fail("缺少模型 ID", { status: 400 });
    }

    const body = UpdateSchema.parse(await req.json());
    const updated = updateLive2dModel(id, { displayName: body.displayName });
    return ok(updated);
  } catch (e: any) {
    return fail(e.message, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user || user.role !== "super_admin") {
      return fail("权限不足", { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    const paths = formData.getAll("paths");
    const imported = importLive2dModel({
      folderName: readOptionalString(formData.get("folderName")),
      displayName: readOptionalString(formData.get("displayName")),
      files: await Promise.all(
        files.map(async (file, index) => ({
          relativePath: readOptionalString(paths[index]) || file.name,
          buffer: Buffer.from(await file.arrayBuffer()),
        }))
      ),
    });
    return ok(imported, { status: 201 });
  } catch (e: any) {
    return fail(e.message, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user || user.role !== "super_admin") {
      return fail("权限不足", { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return fail("缺少模型 ID", { status: 400 });
    }

    const deleted = deleteLive2dModel(id);
    return ok(deleted);
  } catch (e: any) {
    return fail(e.message, { status: 500 });
  }
}

const UpdateSchema = z.object({
  displayName: z.string().trim().min(1),
});

function readOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
