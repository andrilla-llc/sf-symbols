import type { RequestOptions } from "../types.ts";
import { jsonError } from "./json-error.ts";

export function routeNotFoundResponse(
  symbolName: string,
  options: RequestOptions,
): Response {
  return jsonError(
    404,
    `Symbol not found: ${symbolName} at size=${options.size}, weight=${options.weight}`,
  );
}
