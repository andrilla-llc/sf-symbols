export function normalizeHexColor(rawValue: string | null): string | null {
  if (!rawValue) return null;

  const color = rawValue.trim().replace(/^#/, ""),
    isShortHex = /^[0-9a-fA-F]{3}$/.test(color),
    isLongHex = /^[0-9a-fA-F]{6}$/.test(color);

  if (!isShortHex && !isLongHex) return null;
  return `#${color}`;
}
