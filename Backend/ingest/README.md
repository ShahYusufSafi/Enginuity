# ingest/ — formats in, canonical models out

Importers turn boundary formats into a `DrawingModel`. Nothing outside this directory and the converter service knows what a DXF is. Rationale: [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §3.4.

## `dxf_importer.py`

`DxfImporter` parses LINE, LWPOLYLINE, POLYLINE (2D), ARC and CIRCLE via ezdxf; reads layers, `$INSUNITS` and the DXF version; computes the bbox; records the file's SHA-256 in `DrawingSource`.

`ImportReport` carries the counts, the entity types skipped, and warnings. Nothing is dropped silently — an engineer needs to know what the tool ignored.

## Known gaps

- Polyline bulges (arc segments inside a polyline) import as straight lines, with a warning. Fixed when closed-region extraction needs them.
- TEXT, DIMENSION, HATCH and INSERT (blocks) aren't imported, only counted.
- Arc bboxes use the full-circle extent. Conservative: fits correctly, never clips.

## Adding an importer

Implement the `DrawingImporter` protocol, emit entities with stable ids, fill `DrawingSource` with the content hash, count everything skipped, and add round-trip tests like `tests/test_dxf_import.py`.
