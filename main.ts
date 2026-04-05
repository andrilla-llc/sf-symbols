import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";
import { build } from "vite";
import react from "@vitejs/plugin-react";

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

let compiledGlobalsCssCache: string | null = null,
  compiledGlobalsCssErrorCache: string | null = null,
  compiledClientJsCache: string | null = null,
  compiledClientJsErrorCache: string | null = null;

async function getCompiledGlobalsCss(): Promise<string> {
  if (compiledGlobalsCssCache !== null) return compiledGlobalsCssCache;
  if (compiledGlobalsCssErrorCache !== null) {
    throw new Error(compiledGlobalsCssErrorCache);
  }

  try {
    const sourceCss = await Deno.readTextFile("src/globals.css");

    const result = await postcss([
      tailwindPostcss(),
    ]).process(sourceCss, {
      from: "src/globals.css",
    });

    compiledGlobalsCssCache = result.css;
    return result.css;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    compiledGlobalsCssErrorCache = message;
    throw new Error(`Tailwind compile failed: ${message}`);
  }
}

async function getCompiledClientJs(): Promise<string> {
  if (compiledClientJsCache !== null) return compiledClientJsCache;
  if (compiledClientJsErrorCache !== null) {
    throw new Error(compiledClientJsErrorCache);
  }

  try {
    const buildResult = await build({
      configFile: false,
      root: Deno.cwd(),
      appType: "custom",
      plugins: [
        react(),
      ],
      resolve: {
        alias: {
          "@std/text": "jsr:@std/text",
        },
      },
      build: {
        write: false,
        minify: false,
        sourcemap: false,
        rollupOptions: {
          input: "src/main.tsx",
          output: {
            format: "es",
            entryFileNames: "client.js",
          },
        },
      },
    });

    const outputList = Array.isArray(buildResult) ? buildResult : [buildResult];
    const outputChunkList = outputList.flatMap((output) =>
      "output" in output ? output.output : []
    );
    const entryChunk = outputChunkList.find((chunk) =>
      chunk.type === "chunk" && chunk.isEntry
    );

    if (!entryChunk || entryChunk.type !== "chunk") {
      throw new Error("Vite did not produce an entry client chunk");
    }

    compiledClientJsCache = entryChunk.code;
    compiledClientJsErrorCache = null;
    return entryChunk.code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    compiledClientJsErrorCache = message;
    throw new Error(`Client script compile failed: ${message}`);
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
    } catch {
      return jsonError(500, "Could not compile Tailwind CSS");
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

  if (url.pathname === "/") {
    try {
      const indexHtml = await Deno.readTextFile("src/index.html");

      const withRoot = indexHtml.includes('<div id="root"></div>')
        ? indexHtml
        : indexHtml.replace(
          "</body>",
          `<div id="root"></div></body>`,
        );
      const html = withRoot.includes('src="/dist/client.js"')
        ? withRoot
        : withRoot.replace(
          "</body>",
          `<script type="module" src="/dist/client.js"></script></body>`,
        );

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch {
      return jsonError(500, "Could not render React app");
    }
  }

  if (url.pathname === "/dist/client.js") {
    try {
      const clientJs = await getCompiledClientJs();

      return new Response(clientJs, {
        status: 200,
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return jsonError(
        500,
        `Could not compile client script: ${errorMessage}`,
      );
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
