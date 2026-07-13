import { fail, ok } from "@/lib/api";
import { listLive2dModels } from "@/lib/live2dAssets";
import { getLive2dDb, listAllLive2dModels, registerLive2dModel } from "@/lib/live2dStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 确保数据库同步最新的文件系统模型
    getLive2dDb();
    return ok(listAllLive2dModels());
  } catch (error) {
    return fail(error, { status: 500 });
  }
}
