import type { RequestOptions } from "../types.ts";
import { updateSvgTagAttributes } from "./index.ts";

export function transformSvg(svgText: string, options: RequestOptions): string {
  let outputSvg = svgText;

  const rootAttributeMap: Record<string, string> = {};

  if (options.fm === "svg") {
    if (options.w) rootAttributeMap.width = `${options.w}`;
    if (options.h) rootAttributeMap.height = `${options.h}`;
  }

  if (options.fill) rootAttributeMap.fill = options.fill;
  if (options.stroke) rootAttributeMap.stroke = options.stroke;
  if (options.strokeW !== null) {
    rootAttributeMap["stroke-width"] = `${options.strokeW}`;
  }

  if (options.p !== null || options.bg) {
    const viewBoxMatch = outputSvg.match(/viewBox="([^"]+)"/i);

    if (viewBoxMatch) {
      const viewBoxValue = viewBoxMatch[1].trim(),
        viewBoxPartList = viewBoxValue.split(/\s+/).map(Number);

      if (
        viewBoxPartList.length === 4 &&
        viewBoxPartList.every((part) => Number.isFinite(part))
      ) {
        const [originalMinX, originalMinY, originalWidth, originalHeight] =
          viewBoxPartList;

        let minX = originalMinX,
          minY = originalMinY,
          width = originalWidth,
          height = originalHeight;

        if (options.p !== null) {
          minX = originalMinX - options.p;
          minY = originalMinY - options.p;
          width = originalWidth + options.p * 2;
          height = originalHeight + options.p * 2;
        }

        rootAttributeMap.viewBox = `${minX} ${minY} ${width} ${height}`;

        if (options.bg) {
          const backgroundRect =
              `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${options.bg}" stroke="none" stroke-width="0"/>`,
            svgOpenTagMatch = outputSvg.match(/<svg\b[^>]*>/i);

          if (svgOpenTagMatch && typeof svgOpenTagMatch.index === "number") {
            const insertIndex = svgOpenTagMatch.index +
              svgOpenTagMatch[0].length;
            outputSvg = `${outputSvg.slice(0, insertIndex)}${backgroundRect}${
              outputSvg.slice(insertIndex)
            }`;
          }
        }
      }
    }
  }

  if (Object.keys(rootAttributeMap).length > 0) {
    outputSvg = updateSvgTagAttributes(outputSvg, rootAttributeMap);
  }

  return outputSvg;
}
