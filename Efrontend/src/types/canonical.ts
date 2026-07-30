/**
 * TypeScript mirror of the canonical model (Backend/core/model.py).
 *
 * Keep in sync with SCHEMA_VERSION on the backend. The backend publishes its
 * JSON Schemas at GET /api/schema — when in doubt, that endpoint is the truth.
 */

export const SCHEMA_VERSION = "0.1.0";

export interface Point2 {
  x: number;
  y: number;
}

export type Units = "unitless" | "in" | "ft" | "mm" | "cm" | "m";

interface EntityBase {
  id: string;
  layer: string;
}

export interface LineEntity extends EntityBase {
  kind: "line";
  start: Point2;
  end: Point2;
}

export interface PolylineEntity extends EntityBase {
  kind: "polyline";
  points: Point2[];
  closed: boolean;
}

export interface ArcEntity extends EntityBase {
  kind: "arc";
  center: Point2;
  radius: number;
  /** degrees, counter-clockwise from +x */
  start_angle: number;
  end_angle: number;
}

export interface CircleEntity extends EntityBase {
  kind: "circle";
  center: Point2;
  radius: number;
}

export type Entity = LineEntity | PolylineEntity | ArcEntity | CircleEntity;

export interface Layer {
  name: string;
  color_index: number | null;
}

export interface BBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface DrawingSource {
  filename: string | null;
  file_format: "dxf";
  format_version: string | null;
  sha256: string | null;
}

export interface DrawingModel {
  schema_version: string;
  model_kind: "drawing";
  units: Units;
  layers: Layer[];
  entities: Entity[];
  bbox: BBox | null;
  source: DrawingSource | null;
}

export interface ImportReport {
  importer_name: string;
  importer_version: string;
  imported_entities: number;
  skipped_by_type: Record<string, number>;
  warnings: string[];
}

export interface ImportResponse {
  model: DrawingModel;
  report: ImportReport;
}

/* ---------------- Poisson 1D ---------------- */

export interface SineForcing {
  type: "sine";
  amplitude: number;
  mode: number;
}

export interface ConstantForcing {
  type: "constant";
  value: number;
}

export interface PolynomialForcing {
  type: "polynomial";
  coefficients: number[];
}

export type Forcing = SineForcing | ConstantForcing | PolynomialForcing;

export interface Poisson1DModel {
  domain: [number, number];
  num_elements: number;
  conductivity?: number;
  dirichlet: [number, number];
  forcing: Forcing;
}

export interface Poisson1DResult {
  x: number[];
  u: number[];
  h: number;
  num_dofs: number;
}

export interface LibraryVersions {
  python: string;
  numpy: string;
  scipy: string;
  ezdxf: string | null;
}

export interface RunManifest {
  run_id: string;
  created_utc: string;
  schema_version: string;
  solver_name: string;
  solver_version: string;
  input_sha256: string;
  libraries: LibraryVersions;
  notes: Record<string, string>;
}

/* ---------------- Method ladder (strategy §3.0) ---------------- */

export type Fidelity = "analytical" | "numerical" | "surrogate";

export type ErrorBasis =
  | "exact"
  | "richardson"
  | "a_priori"
  | "residual"
  | "unknown";

export interface ErrorEstimate {
  basis: ErrorBasis;
  /** Relative L2 estimate. null means it wasn't estimated — not that it's zero. */
  relative: number | null;
  detail: string;
}

export interface MethodInfo {
  name: string;
  version: string;
  fidelity: Fidelity;
  describes: string;
}

export interface Attempt {
  method: MethodInfo;
  outcome: "used" | "not_applicable" | "insufficient_accuracy" | "over_budget";
  error: ErrorEstimate | null;
  note: string;
}

export interface SelectionRecord {
  requested_tolerance: number | null;
  chosen: MethodInfo;
  error: ErrorEstimate;
  tolerance_met: boolean;
  attempts: Attempt[];
  refinements: number;
  /** Plain-language sentence for the user, written by the backend. Show this. */
  message: string;
}

export interface Budget {
  max_dofs: number;
  max_refinements: number;
}

export interface SimulateRequest {
  model: Poisson1DModel;
  /** Omit to skip error estimation and its extra solve. */
  tolerance?: number | null;
  budget?: Budget | null;
}

export interface SimulateResponse {
  result: Poisson1DResult;
  manifest: RunManifest;
  selection: SelectionRecord;
}
