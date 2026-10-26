# converter/ — the DWG edge adapter

Converts proprietary DWG to open DXF. That's the whole job. Everything downstream speaks DXF, parsed in-process by the backend. Rationale: [`ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §3.4.

## Why it's a separate service

It wraps **ODA File Converter** — an AppImage run under xvfb. ODA's free tooling is licensed for end-user use; embedding it in a commercial service needs paid membership (verify current terms before any commercial launch).

**The binary is not in this repo.** Download the Linux AppImage from [opendesign.com](https://www.opendesign.com/guestfiles/oda_file_converter) and save it as `converter/ODAFileConverter.AppImage` (the path is gitignored). Without it the service still starts; DWG requests fail and `GET /debug-odafc` reports the binary as missing. Keeping it behind an HTTP boundary means swapping it for something else touches this service and nothing else.

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
