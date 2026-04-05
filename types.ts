export type OutputFormat = "svg" | "png" | "webp" | "jpg";

export type RequestOptions = {
  bg: string | null;
  fill: string | null;
  fm: OutputFormat;
  h: number | null;
  p: number | null;
  size: string;
  stroke: string | null;
  strokeW: number | null;
  symbolName: string;
  w: number | null;
  weight: string;
};
