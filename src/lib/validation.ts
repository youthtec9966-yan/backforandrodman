const MB = 1024 * 1024;

const FILE_LIMITS: Record<string, number> = {
  pdf: 150 * MB,
  docx: 150 * MB,
  doc: 150 * MB,
  wps: 150 * MB,
  pptx: 150 * MB,
  ppt: 150 * MB,
  txt: 10 * MB,
  md: 10 * MB,
  markdown: 10 * MB,
  html: 10 * MB,
  xlsx: 10 * MB,
  xls: 10 * MB,
  png: 20 * MB,
  jpg: 20 * MB,
  jpeg: 20 * MB,
  bmp: 20 * MB,
  gif: 20 * MB,
};

export function validateDocumentFile(fileName: string, sizeInBytes: number) {
  const extension = getExtension(fileName);
  const limit = FILE_LIMITS[extension];

  if (!limit) {
    return {
      valid: false,
      message: `Unsupported file type .${extension || "(none)"}`,
    };
  }

  if (sizeInBytes > limit) {
    return {
      valid: false,
      message: `File exceeds ${formatBytes(limit)} limit for .${extension}`,
    };
  }

  return { valid: true, message: null };
}

export function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

export function formatBytes(bytes: number) {
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${bytes} bytes`;
}
