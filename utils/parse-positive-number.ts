export function parsePositiveNumber(rawValue: string | null): number | null {
  if (!rawValue) return null;
  const numberValue = Number(rawValue);
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue <= 0) return null;
  return numberValue;
}
