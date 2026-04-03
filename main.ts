import sharp from "sharp";

const SIZE_SET = new Set(["small", "medium", "large"]),
  WEIGHT_SET = new Set([
    "ultralight",
    "thin",
    "light",
    "regular",
    "medium",
    "semibold",
    "bold",
    "heavy",
    "black",
  ]),
  FORMAT_SET = new Set(["svg", "png", "webp", "jpg"]);

const DEFAULT_SIZE = "small",
  DEFAULT_WEIGHT = "regular",
  DEFAULT_FORMAT = "svg";

const PUBLIC_BASE_PATH = "symbols";

const TEXT_DECODER = new TextDecoder(),
  TEXT_ENCODER = new TextEncoder();

type OutputFormat = "svg" | "png" | "webp" | "jpg";

type RequestOptions = {
  symbolName: string;
  size: string;
  weight: string;
  fm: OutputFormat;
  fill: string | null;
  stroke: string | null;
  strokeW: number | null;
  w: number | null;
  h: number | null;
};

function normalizeHexColor(rawValue: string | null): string | null {
  if (!rawValue) return null;

  const color = rawValue.trim().replace(/^#/, "");
  const isShortHex = /^[0-9a-fA-F]{3}$/.test(color);
  const isLongHex = /^[0-9a-fA-F]{6}$/.test(color);

  if (!isShortHex && !isLongHex) return null;
  return `#${color}`;
}

function parsePositiveNumber(rawValue: string | null): number | null {
  if (!rawValue) return null;
  const numberValue = Number(rawValue);
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue <= 0) return null;
  return numberValue;
}

function parseOptions(
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
    value: { symbolName, size, weight, fm, fill, stroke, strokeW, w, h },
  };
}

function escapeXmlAttribute(rawValue: string): string {
  return rawValue
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function updateSvgTagAttributes(
  svgText: string,
  attributes: Record<string, string>,
): string {
  const svgOpenTagMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!svgOpenTagMatch) return svgText;

  let svgOpenTag = svgOpenTagMatch[0];

  for (const [name, value] of Object.entries(attributes)) {
    const attributeRegex = new RegExp(`\\s${name}="[^"]*"`, "i");
    if (attributeRegex.test(svgOpenTag)) {
      svgOpenTag = svgOpenTag.replace(
        attributeRegex,
        ` ${name}="${escapeXmlAttribute(value)}"`,
      );
    } else {
      svgOpenTag = svgOpenTag.replace(
        />$/,
        ` ${name}="${escapeXmlAttribute(value)}">`,
      );
    }
  }

  return `${svgText.slice(0, svgOpenTagMatch.index)}${svgOpenTag}${
    svgText.slice(
      (svgOpenTagMatch.index ?? 0) + svgOpenTagMatch[0].length,
    )
  }`;
}

function addStyleToSvg(svgText: string, styleRule: string): string {
  const styleTagMatch = svgText.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);

  if (styleTagMatch && typeof styleTagMatch.index === "number") {
    const fullMatch = styleTagMatch[0];
    const styleStart = styleTagMatch.index;
    const styleEnd = styleStart + fullMatch.length;
    const newStyleTag = `<style>${styleTagMatch[1]}\n${styleRule}</style>`;
    return `${svgText.slice(0, styleStart)}${newStyleTag}${
      svgText.slice(styleEnd)
    }`;
  }

  const svgOpenTagMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!svgOpenTagMatch || typeof svgOpenTagMatch.index !== "number") {
    return svgText;
  }

  const insertIndex = svgOpenTagMatch.index + svgOpenTagMatch[0].length;
  return `${svgText.slice(0, insertIndex)}<style>${styleRule}</style>${
    svgText.slice(insertIndex)
  }`;
}

function transformSvg(svgText: string, options: RequestOptions): string {
  let outputSvg = svgText;

  const rootAttributeMap: Record<string, string> = {};

  if (options.fm === "svg") {
    if (options.w) rootAttributeMap.width = `${options.w}`;
    if (options.h) rootAttributeMap.height = `${options.h}`;
  }

  if (Object.keys(rootAttributeMap).length > 0) {
    outputSvg = updateSvgTagAttributes(outputSvg, rootAttributeMap);
  }

  const styleRuleList: string[] = [];

  if (options.fill) styleRuleList.push(`fill: ${options.fill} !important;`);
  if (options.stroke) {
    styleRuleList.push(`stroke: ${options.stroke} !important;`);
  }
  if (options.strokeW !== null) {
    styleRuleList.push(`stroke-width: ${options.strokeW}px !important;`);
  }

  if (styleRuleList.length > 0) {
    const styleRule = `svg, svg * { ${styleRuleList.join(" ")} }`;
    outputSvg = addStyleToSvg(outputSvg, styleRule);
  }

  return outputSvg;
}

async function getSymbolSvgPath(
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

function resolveContentType(fm: OutputFormat): string {
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

async function renderImage(
  svgText: string,
  options: RequestOptions,
): Promise<Uint8Array> {
  if (options.fm === "svg") return TEXT_ENCODER.encode(svgText);

  let image = sharp(TEXT_ENCODER.encode(svgText), { density: 2048 });

  if (options.w || options.h) {
    image = image.resize({
      width: options.w ? Math.round(options.w) : undefined,
      height: options.h ? Math.round(options.h) : undefined,
      fit: "contain",
      withoutEnlargement: true,
    });
  }

  if (options.fm === "png") return await image.png().toBuffer();
  if (options.fm === "webp") return await image.webp().toBuffer();
  return await image.jpeg().toBuffer();
}

function getCacheControlHeader(): string {
  return "public, max-age=31536000, immutable";
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function routeNotFoundResponse(
  symbolName: string,
  options: RequestOptions,
): Response {
  return jsonError(
    404,
    `Symbol not found: ${symbolName} at size=${options.size}, weight=${options.weight}`,
  );
}

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        allow: "GET, HEAD",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return new Response("ok", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const parsedResult = parseOptions(url);
  if (!parsedResult.ok) return parsedResult.response;

  const options = parsedResult.value;
  const symbolPath = await getSymbolSvgPath(options);

  if (!symbolPath) return routeNotFoundResponse(options.symbolName, options);

  let svgText: string;
  try {
    const svgBytes = await Deno.readFile(symbolPath);
    svgText = TEXT_DECODER.decode(svgBytes);
  } catch {
    return jsonError(500, "Could not read symbol file");
  }

  const transformedSvg = transformSvg(svgText, options);

  let payload: Uint8Array;
  try {
    payload = await renderImage(transformedSvg, options);
  } catch {
    return jsonError(500, "Image rendering failed");
  }

  const contentType = resolveContentType(options.fm);
  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", getCacheControlHeader());
  headers.set("x-symbol-name", options.symbolName);
  headers.set("x-symbol-size", options.size);
  headers.set("x-symbol-weight", options.weight);
  headers.set("x-output-format", options.fm);

  if (request.method === "HEAD") {
    headers.set("content-length", `${payload.byteLength}`);
    return new Response(null, { status: 200, headers });
  }

  const plainPayload = new Uint8Array(payload);

  return new Response(plainPayload as unknown as BodyInit, {
    status: 200,
    headers,
  });
});
