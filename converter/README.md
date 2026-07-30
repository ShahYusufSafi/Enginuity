# converter/ — the DWG edge adapter

Converts proprietary DWG to open DXF. That's the whole job. Everything downstream speaks DXF, parsed in-process by the backend. Rationale: [`ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §3.4.

## Why it's a separate service

It wraps **ODA File Converter** — an AppImage run under xvfb. ODA's free tooling is licensed for end-user use; embedding it in a commercial service needs paid membership (verify current terms before any commercial launch). Keeping it behind an HTTP boundary means swapping it for something else touches this service and nothing else.

## Endpoints

| Endpoint | Status | Purpose |
|---|---|---|
| `POST /upload-dwg-to-dxf` | current | DWG in, DXF out. Feeds the backend's `/api/import/dxf`. |
| `POST /upload-dwg-to-svg` | legacy | DWG → SVG under `/SVGs/`. The old viewer pipeline; removed once the canonical viewer replaces the Workbench flow. |
| `GET /debug-odafc` | debug | Reports whether the ODA binary is found and executable. |

## Flow

```
ImportPage ──DWG──▶ /upload-dwg-to-dxf ──DXF──▶ backend /api/import/dxf ──▶ canonical model
ImportPage ──DXF──────────────────────────────▶ backend /api/import/dxf ──▶ canonical model
```

DXF uploads never touch this service.
