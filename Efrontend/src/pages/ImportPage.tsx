/**
 * ImportPage — the Phase 0 vertical slice, end to end:
 *
 *   DXF (or DWG via converter edge) → canonical model → interactive viewer
 *   with layers, selection, snapping and measurement.
 *
 * DWG files are first converted to DXF by the converter service
 * (/upload-dwg-to-dxf, ODA at the edge); the backend itself only ever
 * parses DXF (/api/import/dxf). See docs/ARCHITECTURE.md §3.4.
 */

import { useMemo, useRef, useState } from "react";
import NavBar from "../components/NavBar2";
import ModelViewer, { type Measurement } from "../components/ModelViewer/ModelViewer";
import { entityLength, formatDistance, aciToCss } from "../components/ModelViewer/viewerMath";
import type { DrawingModel, ImportReport, ImportResponse } from "../types/canonical";

export default function ImportPage() {
  const [model, setModel] = useState<DrawingModel | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = () => fileInputRef.current?.click();

  const selected = useMemo(
    () => model?.entities.find((e) => e.id === selectedId) ?? null,
    [model, selectedId],
  );

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setModel(null);
    setReport(null);
    setSelectedId(null);
    setMeasurement(null);
    try {
      let dxfFile = file;

      if (file.name.toLowerCase().endsWith(".dwg")) {
        // Edge conversion: DWG -> DXF via converter service (ODA lives there only)
        const fd = new FormData();
        fd.append("file", file);
        const conv = await fetch("/upload-dwg-to-dxf", { method: "POST", body: fd });
        if (!conv.ok) throw new Error(`Converter error: ${conv.status}`);
        const contentType = conv.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = await conv.json();
          throw new Error(body.error ?? "DWG conversion failed.");
        }
        const dxfBlob = await conv.blob();
        dxfFile = new File([dxfBlob], file.name.replace(/\.dwg$/i, ".dxf"));
      }

      const fd = new FormData();
      fd.append("file", dxfFile);
      const res = await fetch("/api/import/dxf", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Import failed: ${res.status}`);
      }
      const body: ImportResponse = await res.json();
      setModel(body.model);
      setReport(body.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleLayer = (name: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    // pt-16 clears the fixed NavBar (it overlays the page instead of occupying space)
    <div className="flex h-screen flex-col bg-white pt-16 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <NavBar />

      {/* shared hidden file input — triggered from sidebar and empty state */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf,.dwg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file
          if (f) void handleFile(f);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* left panel */}
        <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-r border-gray-300 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="mb-2 font-semibold">Import drawing</h2>
            <button
              onClick={pickFile}
              disabled={loading}
              className="w-full rounded bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Importing…" : "Choose DXF / DWG file"}
            </button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          {report && (
            <div className="rounded border border-gray-200 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800">
              <p className="font-semibold">
                Imported {report.imported_entities} entities
              </p>
              {Object.entries(report.skipped_by_type).length > 0 && (
                <p className="mt-1 text-gray-500">
                  Skipped:{" "}
                  {Object.entries(report.skipped_by_type)
                    .map(([t, n]) => `${t}×${n}`)
                    .join(", ")}
                </p>
              )}
              {report.warnings.map((w) => (
                <p key={w} className="mt-1 text-amber-600">⚠ {w}</p>
              ))}
              {model?.source?.sha256 && (
                <p className="mt-1 break-all font-mono text-[10px] text-gray-400">
                  sha256 {model.source.sha256.slice(0, 16)}…
                </p>
              )}
            </div>
          )}

          {model && (
            <div>
              <h3 className="mb-1 font-semibold">Layers</h3>
              {model.layers.map((layer) => (
                <label key={layer.name} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={!hiddenLayers.has(layer.name)}
                    onChange={() => toggleLayer(layer.name)}
                  />
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-gray-300"
                    style={{ background: aciToCss(layer.color_index, "#94a3b8") }}
                  />
                  <span className="truncate">{layer.name}</span>
                </label>
              ))}
            </div>
          )}

          {model && (
            <div>
              <h3 className="mb-1 font-semibold">Tools</h3>
              <button
                onClick={() => {
                  setMeasureMode((m) => !m);
                  setMeasurement(null);
                }}
                className={`rounded border px-3 py-1 text-xs ${
                  measureMode
                    ? "border-amber-500 bg-amber-100 text-amber-800"
                    : "border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-800"
                }`}
              >
                📏 Measure {measureMode ? "(on — click two snap points)" : ""}
              </button>
              {measurement && (
                <p className="mt-2 font-mono text-xs">
                  d = {formatDistance(measurement.distance, model.units)}
                </p>
              )}
            </div>
          )}

          {selected && model && (
            <div className="rounded border border-gray-200 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-1 font-semibold">Selection</h3>
              <p>kind: {selected.kind}</p>
              <p>layer: {selected.layer}</p>
              <p className="font-mono text-[10px]">id (DXF handle): {selected.id}</p>
              <p>
                {selected.kind === "circle" || selected.kind === "arc"
                  ? `r = ${formatDistance(selected.radius, model.units)} · `
                  : ""}
                length: {formatDistance(entityLength(selected), model.units)}
              </p>
              {selected.kind === "polyline" && (
                <p>{selected.closed ? "closed" : "open"} · {selected.points.length} vertices</p>
              )}
            </div>
          )}
        </aside>

        {/* viewer */}
        <main className="relative flex-1 bg-white dark:bg-gray-950">
          {model ? (
            <ModelViewer
              model={model}
              hiddenLayers={hiddenLayers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              measureMode={measureMode}
              onMeasure={setMeasurement}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg">Upload a DXF (or DWG) to begin</p>
                <button
                  onClick={pickFile}
                  disabled={loading}
                  className="mt-4 rounded bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? "Importing…" : "Choose file"}
                </button>
                <p className="mt-4 text-sm">
                  Pan: drag · Zoom: wheel · Select: click · Measure: 📏 then two points
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
