import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";

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

const PORT = 8000;

const textDecoder = new TextDecoder();
const pathSeparator = "/";
const rootPath = ".";
const indexHtmlPath = "src/index.html";
const sourceGlobalsCssPath = "src/globals.css";
const builtManifestPath = "dist/client/.vite/manifest.json";
const builtAssetsPath = "dist/client/assets";

type BuiltManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
};

type BuiltManifest = Record<string, BuiltManifestEntry>;

let compiledGlobalsCssCache: string | null = null,
  compiledGlobalsCssErrorCache: string | null = null,
  builtManifestCache: BuiltManifest | null = null,
  builtManifestErrorCache: string | null = null;

function normalizeSafeRelativePath(pathname: string): string | null {
  const decodedPathname = decodeURIComponent(pathname);
  const withoutLeadingSlash = decodedPathname.replace(/^\/+/, "");
  const normalizedPath = withoutLeadingSlash.replace(/\\/g, "/");

  if (normalizedPath.includes("..")) return null;
  if (normalizedPath.length === 0) return null;

  return normalizedPath;
}

function contentTypeFromPath(path: string): string {
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  if (path.endsWith(".ttf")) return "font/ttf";
  if (path.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function cacheControlForAssetPath(path: string): string {
  if (/\.[A-Za-z0-9_-]{8,}\./.test(path)) {
    return "public, max-age=31536000, immutable";
  }

  return "public, max-age=3600";
}

async function getCompiledGlobalsCss(): Promise<string> {
  if (compiledGlobalsCssCache !== null) return compiledGlobalsCssCache;
  if (compiledGlobalsCssErrorCache !== null) {
    throw new Error(compiledGlobalsCssErrorCache);
  }

  try {
    const sourceCss = await Deno.readTextFile(sourceGlobalsCssPath);

    const result = await postcss([
      tailwindPostcss(),
    ]).process(sourceCss, {
      from: sourceGlobalsCssPath,
    });

    compiledGlobalsCssCache = result.css;
    return result.css;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    compiledGlobalsCssErrorCache = message;
    throw new Error(`Tailwind compile failed: ${message}`);
  }
}

async function getBuiltManifest(): Promise<BuiltManifest> {
  if (builtManifestCache !== null) return builtManifestCache;
  if (builtManifestErrorCache !== null) {
    throw new Error(builtManifestErrorCache);
  }

  try {
    const manifestRaw = await Deno.readTextFile(builtManifestPath);
    const manifest = JSON.parse(manifestRaw) as BuiltManifest;

    builtManifestCache = manifest;
    builtManifestErrorCache = null;

    return manifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    builtManifestErrorCache = message;
    throw new Error(`Could not read Vite manifest: ${message}`);
  }
}

function resolveViteEntryFromManifest(manifest: BuiltManifest): string | null {
  const directMainEntry = manifest["src/main.tsx"];
  if (directMainEntry?.file) return directMainEntry.file;

  for (const entry of Object.values(manifest)) {
    if (entry?.isEntry && entry.file) return entry.file;
  }

  return null;
}

async function serveBuiltAsset(pathname: string): Promise<Response> {
  const safeRelativePath = normalizeSafeRelativePath(pathname);
  if (!safeRelativePath) return jsonError(400, "Invalid asset path");

  const absolutePath = `${rootPath}${pathSeparator}${safeRelativePath}`;

  try {
    const fileInfo = await Deno.stat(absolutePath);
    if (!fileInfo.isFile) return jsonError(404, "Asset not found");

    const fileBytes = await Deno.readFile(absolutePath);

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "content-type": contentTypeFromPath(safeRelativePath),
        "cache-control": cacheControlForAssetPath(safeRelativePath),
      },
    });
  } catch {
    return jsonError(404, "Asset not found");
  }
}

Deno.serve({ port: PORT }, async (request) => {
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

  if (url.pathname === "/dist/globals.css") {
    try {
      const css = await getCompiledGlobalsCss();

      return new Response(css, {
        status: 200,
        headers: {
          "content-type": "text/css; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonError(500, `Could not compile Tailwind CSS: ${message}`);
    }
  }

  if (url.pathname === "/site.webmanifest") {
    try {
      const manifest = await Deno.readTextFile("src/site.webmanifest");

      return new Response(manifest, {
        status: 200,
        headers: {
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    } catch {
      return jsonError(500, "Could not read src/site.webmanifest");
    }
  }

  if (url.pathname.startsWith("/assets/")) {
    const response = await serveBuiltAsset(
      `${builtAssetsPath}/${url.pathname.replace(/^\/assets\//, "")}`,
    );

    if (request.method === "HEAD" && response.status === 200) {
      const contentLength = response.headers.get("content-length");
      const headers = new Headers(response.headers);
      if (contentLength) headers.set("content-length", contentLength);
      return new Response(null, { status: 200, headers });
    }

    return response;
  }

  if (url.pathname === "/") {
    try {
      const indexHtml = await Deno.readTextFile(indexHtmlPath);
      const manifest = await getBuiltManifest();
      const entryFile = resolveViteEntryFromManifest(manifest);

      if (!entryFile) {
        return jsonError(
          500,
          "Could not locate Vite entry in dist/client/.vite/manifest.json",
        );
      }

      const withRoot = indexHtml.includes('<div id="root"></div>')
        ? indexHtml
        : indexHtml.replace(
          "</body>",
          `<div id="root"></div></body>`,
        );

      const entry = manifest["src/main.tsx"] ??
        Object.values(manifest).find((candidate) => candidate?.isEntry);
      const cssFileList = entry?.css ?? [];

      const styleTagList = cssFileList.map((cssFile) =>
        `<link rel="stylesheet" href="/assets/${cssFile}">`
      );
      const scriptTag =
        `<script type="module" src="/assets/${entryFile}"></script>`;
      const assetTagList = [...styleTagList, scriptTag].join("");
      const html = withRoot.replace(
        "</body>",
        `${assetTagList}</body>`,
      );

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonError(500, `Could not render React app: ${message}`);
    }
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
