export function addStyleToSvg(svgText: string, styleRule: string): string {
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
