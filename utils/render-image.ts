import type { RequestOptions } from '../types.ts'
import sharp from 'sharp'
const textEncoder = new TextEncoder()

export async function renderImage(
	svgText: string,
	options: RequestOptions,
): Promise<Uint8Array> {
	if (options.fm === 'svg') return textEncoder.encode(svgText)

	const background = options.bg ?? '#00000000'
	let image = sharp(textEncoder.encode(svgText), { density: 2048 })

	const viewBox = svgText.match(/viewBox="([^"]+)"/)?.[1],
		viewBoxPartList = viewBox?.trim().split(/\s+/).map(Number)

	const vbWidth =
		viewBoxPartList &&
		viewBoxPartList.length === 4 &&
		Number.isFinite(viewBoxPartList[2]) &&
		viewBoxPartList[2] > 0
			? Math.round(viewBoxPartList[2])
			: undefined

	const vbHeight =
		viewBoxPartList &&
		viewBoxPartList.length === 4 &&
		Number.isFinite(viewBoxPartList[3]) &&
		viewBoxPartList[3] > 0
			? Math.round(viewBoxPartList[3])
			: undefined

	const resizeWidth = options.w ? Math.round(options.w) : vbWidth
	const resizeHeight = options.h ? Math.round(options.h) : vbHeight

	if (resizeWidth || resizeHeight) {
		image = image.resize({
			width: resizeWidth,
			height: resizeHeight,
			fit: 'contain',
			withoutEnlargement: true,
			background,
		})
	}

	if (options.p !== null) {
		const padding = Math.round(options.p)

		image = image.extend({
			top: padding,
			right: padding,
			bottom: padding,
			left: padding,
			background,
		})
	}

	if (options.fm === 'png') return await image.png().toBuffer()
	if (options.fm === 'webp') return await image.webp().toBuffer()
	const flattenedImage = image.flatten({ background })
	return await flattenedImage.jpeg().toBuffer()
}
