import { fail } from "@/lib/api";
import { getPlayerAsset } from "@/lib/live2dAssets";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ assetPath: string[] }> }) {
  try {
    const { assetPath } = await context.params;
    const asset = getPlayerAsset(assetPath);
    return new Response(asset.buffer, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return fail(error, { status: 404 });
  }
}
