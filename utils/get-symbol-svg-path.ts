import type { RequestOptions } from "../types.ts";

const PUBLIC_BASE_PATH = "symbols";

export async function getSymbolSvgPath(
  options: RequestOptions,
): Promise<string | null> {
  const safeSymbolName = options.symbolName.replace(/^\/+/, "").replace(
    /\/+/g,
    "/",
  );
  const relativePath =
    `${PUBLIC_BASE_PATH}/${options.size}/${options.weight}/${safeSymbolName}.svg`;

  try {
    const fileInfo = await Deno.stat(relativePath);
    if (!fileInfo.isFile) return null;
    return relativePath;
  } catch {
    return null;
  }
}
