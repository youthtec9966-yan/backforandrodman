import { getLive2dPreviewHtml } from "@/lib/live2dAssets";

export const runtime = "nodejs";

export async function GET() {
  return new Response(getLive2dPreviewHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
