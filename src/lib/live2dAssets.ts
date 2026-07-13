import fs from "fs";
import path from "path";

export type Live2dModelOption = {
  id: string;
  name: string;
  folderName: string;
  modelPath: string;
  previewUrl: string;
};

const standaloneAssetsRoot = path.join(process.cwd(), "standalone-assets");
const live2dRoot = path.join(standaloneAssetsRoot, "live2d_models");
const playerRoot = path.join(standaloneAssetsRoot, "player");

export function listLive2dModels(): Live2dModelOption[] {
  if (!fs.existsSync(live2dRoot)) {
    return [];
  }

  return fs
    .readdirSync(live2dRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const folderName = entry.name;
      const modelFile = findModelFile(path.join(live2dRoot, folderName));
      if (!modelFile) {
        return null;
      }
      const relativePath = normalizeRelativePath(path.relative(live2dRoot, modelFile));
      const displayName = humanizeModelName(folderName);
      return {
        id: folderName,
        name: displayName,
        folderName,
        modelPath: relativePath,
        previewUrl: `/api/live2d/preview?model=${encodeURIComponent(`/api/live2d/model-files/${relativePath}`)}&preview=1`,
      } satisfies Live2dModelOption;
    })
    .filter((item): item is Live2dModelOption => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function getLive2dRootPath() {
  return live2dRoot;
}

export function invalidateLive2dModelDisplayNameCache() {
  // kept for compatibility with callers; display names now come from live2dStore
}

export function getPlayerAsset(assetPath: string[]) {
  return readAssetFromRoot(playerRoot, assetPath);
}

export function getModelAsset(assetPath: string[]) {
  return readAssetFromRoot(live2dRoot, stripModelPathPrefixes(assetPath));
}

export function getLive2dPreviewHtml() {
  const htmlPath = path.join(playerRoot, "live2d_android.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace('<link rel="icon" href="/res/image/logo.ico">', "");
  html = html.replace(
    "background: #000 url('/res/image/bk.png') no-repeat center center;",
    "background: radial-gradient(circle at top, rgba(124, 143, 255, 0.22), rgba(13, 18, 35, 0.96));",
  );
  html = html.replaceAll("./pixi.min.js", "/api/live2d/player-files/pixi.min.js");
  html = html.replaceAll("./live2dcubismcore.min.js", "/api/live2d/player-files/live2dcubismcore.min.js");
  html = html.replaceAll("./cubism4.min.js", "/api/live2d/player-files/cubism4.min.js");
  return html;
}

function findModelFile(folderPath: string): string | null {
  const directModel = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .find((entry) => entry.isFile() && entry.name.endsWith(".model3.json"));
  if (directModel) {
    return path.join(folderPath, directModel.name);
  }
  return null;
}

function humanizeModelName(folderName: string) {
  const mapping: Record<string, string> = {
    mrlu: "阿喜警官",
    yange: "小鹿警官",
  };
  return mapping[folderName] ?? folderName;
}

function normalizeRelativePath(input: string) {
  return input.replace(/\\/g, "/");
}

function readAssetFromRoot(rootPath: string, assetPath: string[]) {
  const normalized = path.normalize(path.join(rootPath, ...assetPath));
  if (!normalized.startsWith(rootPath)) {
    throw new Error("非法资源路径");
  }
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    throw new Error("资源不存在");
  }
  return {
    filePath: normalized,
    buffer: fs.readFileSync(normalized),
    contentType: detectContentType(normalized),
  };
}

function detectContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".moc3":
      return "application/octet-stream";
    default:
      return "application/octet-stream";
  }
}

function stripModelPathPrefixes(assetPath: string[]) {
  const joined = normalizeRelativePath(assetPath.join("/")).replace(/^\/+/, "");
  const prefixes = [
    "api/live2d/model-files/",
    "assets/models/live2d_models/",
    "models/live2d_models/",
    "live2d_models/",
  ];

  const matchedPrefix = prefixes.find((prefix) => joined.startsWith(prefix));
  if (!matchedPrefix) {
    return assetPath;
  }

  const trimmed = joined.slice(matchedPrefix.length);
  return trimmed.split("/").filter(Boolean);
}
