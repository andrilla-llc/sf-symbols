import type { OutputFormat, RequestOptions } from "../types.ts";
import { jsonError, normalizeHexColor, parsePositiveNumber } from "./index.ts";

const SIZE_SET = new Set(["small", "medium", "large"]);
const WEIGHT_SET = new Set([
  "ultralight",
  "thin",
  "light",
  "regular",
  "medium",
  "semibold",
  "bold",
  "heavy",
  "black",
]);
const FORMAT_SET = new Set<OutputFormat>(["svg", "png", "webp", "jpg"]);

const DEFAULT_SIZE = "small",
  DEFAULT_WEIGHT = "regular",
  DEFAULT_FORMAT = "svg";

export function parseOptions(
  url: URL,
): { ok: true; value: RequestOptions } | { ok: false; response: Response } {
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(
    /\/+$/,
    "",
  );
  const symbolName = pathname.endsWith(".svg")
    ? pathname.slice(0, -4)
    : pathname;

  if (!symbolName) {
    return {
      ok: false,
      response: jsonError(
        400,
        "Missing symbol path. Use /[symbol.name], for example /hand.palm.facing",
      ),
    };
  }

  const size = (url.searchParams.get("size") ?? DEFAULT_SIZE).toLowerCase();
  if (!SIZE_SET.has(size)) {
    return { ok: false, response: jsonError(400, `Invalid size: ${size}`) };
  }

  const weight = (url.searchParams.get("weight") ?? DEFAULT_WEIGHT)
    .toLowerCase();
  if (!WEIGHT_SET.has(weight)) {
    return { ok: false, response: jsonError(400, `Invalid weight: ${weight}`) };
  }

  const fm = (url.searchParams.get("fm") ?? DEFAULT_FORMAT)
    .toLowerCase() as OutputFormat;
  if (!FORMAT_SET.has(fm)) {
    return { ok: false, response: jsonError(400, `Invalid fm: ${fm}`) };
  }

  const fill = normalizeHexColor(url.searchParams.get("fill"));
  if (url.searchParams.get("fill") && !fill) {
    return {
      ok: false,
      response: jsonError(400, "Invalid fill. Use hex without #, e.g. ff0000"),
    };
  }

  const bg = normalizeHexColor(url.searchParams.get("bg"));
  if (url.searchParams.get("bg") && !bg) {
    return {
      ok: false,
      response: jsonError(400, "Invalid bg. Use hex without #, e.g. ffffff"),
    };
  }

  const stroke = normalizeHexColor(url.searchParams.get("stroke"));
  if (url.searchParams.get("stroke") && !stroke) {
    return {
      ok: false,
      response: jsonError(
        400,
        "Invalid stroke. Use hex without #, e.g. 000000",
      ),
    };
  }

  const strokeW = parsePositiveNumber(url.searchParams.get("stroke-w"));
  if (url.searchParams.get("stroke-w") && strokeW === null) {
    return {
      ok: false,
      response: jsonError(400, "Invalid stroke-w. Must be a positive number"),
    };
  }

  const p = parsePositiveNumber(url.searchParams.get("p"));
  if (url.searchParams.get("p") && p === null) {
    return {
      ok: false,
      response: jsonError(400, "Invalid p. Must be a positive number"),
    };
  }

  const w = parsePositiveNumber(url.searchParams.get("w"));
  if (url.searchParams.get("w") && w === null) {
    return {
      ok: false,
      response: jsonError(400, "Invalid w. Must be a positive number"),
    };
  }

  const h = parsePositiveNumber(url.searchParams.get("h"));
  if (url.searchParams.get("h") && h === null) {
    return {
      ok: false,
      response: jsonError(400, "Invalid h. Must be a positive number"),
    };
  }

  return {
    ok: true,
    value: { symbolName, size, weight, fm, fill, bg, stroke, strokeW, p, w, h },
  };
}
