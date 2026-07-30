"""DXF importer tests: round-trip a generated DXF through the importer.

The fixture DXF is generated with ezdxf itself, which keeps the test
hermetic (no binary fixtures in the repo) while exercising the real parser.
"""

from __future__ import annotations

import io

import ezdxf
import pytest

from core.model import Units
from ingest.dxf_importer import DxfImporter


def build_sample_dxf() -> bytes:
    """A small drawing: two layers, line + closed polyline + arc + circle,
    plus an entity type we do not support yet (TEXT) to test skip-reporting."""
    doc = ezdxf.new("R2013", setup=False)
    doc.header["$INSUNITS"] = 4  # millimeters
    doc.layers.add("PROFILE", color=1)
    doc.layers.add("AXIS", color=3)

    msp = doc.modelspace()
    msp.add_line((0, 0), (100, 0), dxfattribs={"layer": "AXIS"})
    msp.add_lwpolyline(
        [(0, 0), (100, 0), (100, 50), (0, 50)],
        close=True,
        dxfattribs={"layer": "PROFILE"},
    )
    msp.add_arc(center=(50, 25), radius=10, start_angle=0, end_angle=180, dxfattribs={"layer": "PROFILE"})
    msp.add_circle(center=(20, 25), radius=5, dxfattribs={"layer": "PROFILE"})
    msp.add_text("not supported yet", dxfattribs={"layer": "AXIS"})

    buf = io.StringIO()
    doc.write(buf)
    return buf.getvalue().encode("utf-8")


@pytest.fixture()
def imported():
    data = build_sample_dxf()
    return DxfImporter().import_bytes(data, filename="sample.dxf"), data


def test_counts_and_kinds(imported):
    (model, report), _ = imported
    kinds = sorted(e.kind for e in model.entities)
    assert kinds == ["arc", "circle", "line", "polyline"]
    assert report.imported_entities == 4
    assert report.skipped_by_type.get("TEXT") == 1


def test_units_and_layers(imported):
    (model, _), _ = imported
    assert model.units == Units.millimeter
    layer_names = {layer.name for layer in model.layers}
    assert {"PROFILE", "AXIS"}.issubset(layer_names)


def test_polyline_closed_and_coordinates(imported):
    (model, _), _ = imported
    poly = next(e for e in model.entities if e.kind == "polyline")
    assert poly.closed is True
    assert len(poly.points) == 4
    assert poly.points[2].x == 100 and poly.points[2].y == 50


def test_bbox_covers_geometry(imported):
    (model, _), _ = imported
    assert model.bbox is not None
    assert model.bbox.min_x <= 0 and model.bbox.max_x >= 100
    assert model.bbox.min_y <= 0 and model.bbox.max_y >= 50


def test_source_provenance(imported):
    (model, _), data = imported
    assert model.source is not None
    assert model.source.filename == "sample.dxf"
    assert model.source.sha256 is not None and len(model.source.sha256) == 64
    assert model.source.format_version  # e.g. AC1027


def test_entity_ids_are_dxf_handles(imported):
    (model, _), _ = imported
    ids = [e.id for e in model.entities]
    assert len(ids) == len(set(ids))  # unique
    assert all(ids)  # non-empty


def test_serialization_roundtrip(imported):
    """Canonical model must survive JSON round-trips losslessly."""
    from core.model import DrawingModel

    (model, _), _ = imported
    restored = DrawingModel.model_validate_json(model.model_dump_json())
    assert restored == model
