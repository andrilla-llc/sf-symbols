export type OutputFormat = "svg" | "png" | "webp" | "jpg";

export type RequestOptions = {
  symbolName: string;
  size: string;
  weight: string;
  fm: OutputFormat;
  fill: string | null;
  bg: string | null;
  stroke: string | null;
  strokeW: number | null;
  p: number | null;
  w: number | null;
  h: number | null;
};
