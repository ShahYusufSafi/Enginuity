"""DXF -> canonical model.

DXF is the primary intake format (§3.4): openly documented, exported by every
CAD tool, parsed in-process with ezdxf. No proprietary converter sits in this
path. DWG gets translated to DXF at the edge by the converter service before
it ever reaches here, which is what keeps ODA swappable.

Handled: LINE, LWPOLYLINE, POLYLINE (2D), ARC, CIRCLE.
Everything else is counted in the report. Nothing is dropped silently — an
engineer needs to know what the tool ignored.

Known gap: polyline bulges (arc segments inside a polyline) come in as straight
segments, with a warning. Fixed when Phase 1 needs real closed regions.
"""

from __future__ import annotations

import math
import tempfile
from pathlib import Path
from typing import Protocol

import ezdxf
from pydantic import BaseModel

from core.model import (
    ArcEntity,
    BBox,
    CircleEntity,
    DrawingModel,
    DrawingSource,
    Entity,
    Layer,
    LineEntity,
    Point2,
    PolylineEntity,
    Units,
)
from core.provenance import sha256_of_bytes

IMPORTER_NAME = "dxf_importer"
IMPORTER_VERSION = "1.0.0"

# DXF $INSUNITS header codes -> canonical units
_INSUNITS_MAP: dict[int, Units] = {
    0: Units.unitless,
    1: Units.inch,
    2: Units.foot,
    4: Units.millimeter,
    5: Units.centimeter,
    6: Units.meter,
}


class ImportReport(BaseModel):
    """What came in, what got skipped, what the user should be warned about."""

    importer_name: str = IMPORTER_NAME
    importer_version: str = IMPORTER_VERSION
    imported_entities: int = 0
    skipped_by_type: dict[str, int] = {}
    warnings: list[str] = []


class DrawingImporter(Protocol):
    """What every importer implements. DXF today, whatever else later.

    The boundary is the point: swapping conversion tooling touches one class.
    """

    def import_bytes(self, data: bytes, filename: str | None = None) -> tuple[DrawingModel, ImportReport]:
        ...


def _bbox_update(bbox: list[float], x: float, y: float) -> None:
    bbox[0] = min(bbox[0], x)
    bbox[1] = min(bbox[1], y)
    bbox[2] = max(bbox[2], x)
    bbox[3] = max(bbox[3], y)


class DxfImporter:
    """Parse DXF bytes into the canonical `DrawingModel`."""

    def import_bytes(self, data: bytes, filename: str | None = None) -> tuple[DrawingModel, ImportReport]:
        report = ImportReport()

        # Via a temp file rather than a stream: ezdxf's encoding detection
        # (DXF can be ASCII with $DWGCODEPAGE, or UTF-8) is most reliable when
        # it opens the file itself.
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)
        try:
            doc = ezdxf.readfile(str(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)

        msp = doc.modelspace()

        units = _INSUNITS_MAP.get(int(doc.header.get("$INSUNITS", 0)), Units.unitless)
        if units is Units.unitless:
            report.warnings.append(
                "Drawing has no length unit ($INSUNITS=0 or unknown); distances are unitless."
            )

        layers = [
            Layer(name=layer.dxf.name, color_index=getattr(layer.dxf, "color", None))
            for layer in doc.layers
        ]

        entities: list[Entity] = []
        bbox = [math.inf, math.inf, -math.inf, -math.inf]
        bulge_warned = False

        for e in msp:
            dxftype = e.dxftype()
            handle = str(e.dxf.handle)
            layer = str(getattr(e.dxf, "layer", "0"))

            if dxftype == "LINE":
                s, t = e.dxf.start, e.dxf.end
                entities.append(
                    LineEntity(
                        id=handle,
                        layer=layer,
                        start=Point2(x=s.x, y=s.y),
                        end=Point2(x=t.x, y=t.y),
                    )
                )
                _bbox_update(bbox, s.x, s.y)
                _bbox_update(bbox, t.x, t.y)

            elif dxftype == "LWPOLYLINE":
                pts = [Point2(x=p[0], y=p[1]) for p in e.get_points("xyb")]
                if any(abs(p[2]) > 1e-12 for p in e.get_points("xyb")) and not bulge_warned:
                    report.warnings.append(
                        "Polyline arc segments (bulges) imported as straight lines (v0 limitation)."
                    )
                    bulge_warned = True
                entities.append(
                    PolylineEntity(id=handle, layer=layer, points=pts, closed=bool(e.closed))
                )
                for p in pts:
                    _bbox_update(bbox, p.x, p.y)

            # The old heavyweight POLYLINE, whose points live in child VERTEX
            # entities rather than inline. 3D polylines fall through to the
            # skip counter — this is a 2D importer.
            elif dxftype == "POLYLINE" and e.is_2d_polyline:
                pts = [Point2(x=v.dxf.location.x, y=v.dxf.location.y) for v in e.vertices]
                entities.append(
                    PolylineEntity(id=handle, layer=layer, points=pts, closed=bool(e.is_closed))
                )
                for p in pts:
                    _bbox_update(bbox, p.x, p.y)

            elif dxftype == "ARC":
                c = e.dxf.center
                entities.append(
                    ArcEntity(
                        id=handle,
                        layer=layer,
                        center=Point2(x=c.x, y=c.y),
                        radius=float(e.dxf.radius),
                        start_angle=float(e.dxf.start_angle),
                        end_angle=float(e.dxf.end_angle),
                    )
                )
                # Conservative bbox: full circle extent (correct fit, never clips).
                _bbox_update(bbox, c.x - e.dxf.radius, c.y - e.dxf.radius)
                _bbox_update(bbox, c.x + e.dxf.radius, c.y + e.dxf.radius)

            elif dxftype == "CIRCLE":
                c = e.dxf.center
                entities.append(
                    CircleEntity(
                        id=handle,
                        layer=layer,
                        center=Point2(x=c.x, y=c.y),
                        radius=float(e.dxf.radius),
                    )
                )
                _bbox_update(bbox, c.x - e.dxf.radius, c.y - e.dxf.radius)
                _bbox_update(bbox, c.x + e.dxf.radius, c.y + e.dxf.radius)

            else:
                report.skipped_by_type[dxftype] = report.skipped_by_type.get(dxftype, 0) + 1

        report.imported_entities = len(entities)

        model = DrawingModel(
            units=units,
            layers=layers,
            entities=entities,
            bbox=BBox(min_x=bbox[0], min_y=bbox[1], max_x=bbox[2], max_y=bbox[3])
            if entities
            else None,
            source=DrawingSource(
                filename=filename,
                file_format="dxf",
                format_version=str(doc.dxfversion),
                sha256=sha256_of_bytes(data),
            ),
        )
        return model, report
