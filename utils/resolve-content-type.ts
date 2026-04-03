import type { OutputFormat } from "../types.ts";

export function resolveContentType(fm: OutputFormat): string {
  switch (fm) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
      return "image/jpeg";
    default:
      return "image/svg+xml; charset=utf-8";
  }
}
