export function getCacheControlHeader(): string {
  return "public, max-age=31536000, immutable";
}
