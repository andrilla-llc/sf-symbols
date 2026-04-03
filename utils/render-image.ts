import type { RequestOptions } from "../types.ts";
import sharp from "sharp";
const textEncoder = new TextEncoder();

export async function renderImage(
  svgText: string,
  options: RequestOptions,
): Promise<Uint8Array> {
  if (options.fm === "svg") return textEncoder.encode(svgText);

  let image = sharp(textEncoder.encode(svgText), { density: 2048 });

  if (options.w || options.h) {
    image = image.resize({
      width: options.w ? Math.round(options.w) : undefined,
      height: options.h ? Math.round(options.h) : undefined,
      fit: "contain",
      withoutEnlargement: true,
    });

    if (options.p !== null) {
      const padding = Math.round(options.p);

      image = image.extend({
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
        background: options.bg ?? "#00000000",
      });
    }
  } else if (options.p !== null) {
    const padding = Math.round(options.p);

    image = image.extend({
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
      background: options.bg ?? "#00000000",
    });
  }

  if (options.fm === "png") return await image.png().toBuffer();
  if (options.fm === "webp") return await image.webp().toBuffer();
  return await image.jpeg().toBuffer();
}
