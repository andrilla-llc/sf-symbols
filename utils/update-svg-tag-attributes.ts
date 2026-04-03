import { escapeXmlAttribute } from "./escape-xml-attribute.ts";

export function updateSvgTagAttributes(
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
