export type PathSemantic = "freehand" | "contour" | "centerline" | "manual";

export interface Point2D {
  x: number;
  y: number;
}

export interface VectorPath {
  id: string;
  semantic: PathSemantic;
  points: Point2D[];
  closed: boolean;
}

export interface DrawingDocument {
  schemaVersion: "0.1.0";
  id: string;
  title: string;
  width: number;
  height: number;
  units: "mm";
  paths: VectorPath[];
  createdAt: string;
  updatedAt: string;
}

export function createEmptyDocument(): DrawingDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: "0.1.0",
    id: crypto.randomUUID(),
    title: "Untitled drawing",
    width: 100,
    height: 70,
    units: "mm",
    paths: [],
    createdAt: now,
    updatedAt: now,
  };
}
