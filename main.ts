import {
  getCacheControlHeader,
  getSymbolSvgPath,
  jsonError,
  parseOptions,
  renderImage,
  resolveContentType,
  routeNotFoundResponse,
  transformSvg,
} from "./utils/index.ts";

const textDecoder = new TextDecoder();

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

  const options = parsedResult.value,
    symbolPath = await getSymbolSvgPath(options);

  if (!symbolPath) return routeNotFoundResponse(options.symbolName, options);

  let svgText: string;
  try {
    const svgBytes = await Deno.readFile(symbolPath);
    svgText = textDecoder.decode(svgBytes);
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

  const contentType = resolveContentType(options.fm),
    headers = new Headers();

  headers.set("content-type", contentType);
  headers.set("cache-control", getCacheControlHeader());
  headers.set("x-symbol-name", options.symbolName);
  headers.set("x-symbol-size", options.size);
  headers.set("x-symbol-weight", options.weight);
  headers.set("x-output-format", options.fm);
  headers.set("x-background", options.bg ?? "");
  headers.set("x-padding", options.p === null ? "" : `${options.p}`);

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
