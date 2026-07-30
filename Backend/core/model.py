"""The canonical model: one representation everything else is written against.

Rules (§3.1):
- Anything entering or leaving a solver is one of these schemas.
- File formats (DXF, DWG, SVG) exist at the boundary only, never in here.
- Bump SCHEMA_VERSION when a field changes meaning, and write the migration,
  so a run serialized in 2026 still opens in 2036.

Keep this file boring. Formats, solvers and UIs get replaced around it; this is
the part that shouldn't need rewriting.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, model_validator

SCHEMA_VERSION = "0.1.0"


# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------

class Point2(BaseModel):
    """A point in 2D model space (units defined by the containing model)."""

    x: float
    y: float


class Units(str, Enum):
    """Length unit of a drawing. Mapped from DXF $INSUNITS on import."""

    unitless = "unitless"
    inch = "in"
    foot = "ft"
    millimeter = "mm"
    centimeter = "cm"
    meter = "m"


# ---------------------------------------------------------------------------
# Drawing entities (geometry extracted from CAD files)
# ---------------------------------------------------------------------------

class EntityBase(BaseModel):
    """Common fields for every drawing entity.

    `id` is the DXF handle for imported drawings, so any result can be traced
    back to the exact entity in the file it came from.
    """

    id: str
    layer: str = "0"


class LineEntity(EntityBase):
    kind: Literal["line"] = "line"
    start: Point2
    end: Point2


class PolylineEntity(EntityBase):
    kind: Literal["polyline"] = "polyline"
    points: list[Point2]
    closed: bool = False


class ArcEntity(EntityBase):
    """Circular arc, angles in degrees, counter-clockwise from +x axis."""

    kind: Literal["arc"] = "arc"
    center: Point2
    radius: float
    start_angle: float
    end_angle: float


class CircleEntity(EntityBase):
    kind: Literal["circle"] = "circle"
    center: Point2
    radius: float


Entity = Annotated[
    Union[LineEntity, PolylineEntity, ArcEntity, CircleEntity],
    Field(discriminator="kind"),
]


class Layer(BaseModel):
    name: str
    color_index: int | None = None  # AutoCAD Color Index (ACI), if known


class BBox(BaseModel):
    min_x: float
    min_y: float
    max_x: float
    max_y: float


class DrawingSource(BaseModel):
    """Where a drawing came from — part of the provenance chain."""

    filename: str | None = None
    file_format: Literal["dxf"] = "dxf"
    format_version: str | None = None  # e.g. "AC1027" (AutoCAD 2013 DXF)
    sha256: str | None = None  # hash of the uploaded file bytes


class DrawingModel(BaseModel):
    """Canonical representation of a 2D drawing."""

    schema_version: str = SCHEMA_VERSION
    model_kind: Literal["drawing"] = "drawing"
    units: Units = Units.unitless
    layers: list[Layer] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    bbox: BBox | None = None
    source: DrawingSource | None = None


# ---------------------------------------------------------------------------
# 1D Poisson analysis model (the existing demo, made honest)
#
#   -(k u')' = f   on (x0, x1),   u(x0) = g0,  u(x1) = g1
# ---------------------------------------------------------------------------

class SineForcing(BaseModel):
    """f(x) = amplitude * sin(mode * pi * (x - x0) / L)  — L = domain length."""

    type: Literal["sine"] = "sine"
    amplitude: float = 1.0
    mode: int = Field(default=1, ge=1)


class ConstantForcing(BaseModel):
    """f(x) = value."""

    type: Literal["constant"] = "constant"
    value: float = 1.0


class PolynomialForcing(BaseModel):
    """f(x) = sum_i coefficients[i] * x**i  (coefficients in ascending order)."""

    type: Literal["polynomial"] = "polynomial"
    coefficients: list[float] = Field(default_factory=lambda: [1.0])


Forcing = Annotated[
    Union[SineForcing, ConstantForcing, PolynomialForcing],
    Field(discriminator="type"),
]


class Poisson1DModel(BaseModel):
    """A 1D Poisson problem, described completely.

    This document is the solver input. Hash it and you've identified the run.
    """

    schema_version: str = SCHEMA_VERSION
    model_kind: Literal["poisson1d"] = "poisson1d"
    domain: tuple[float, float] = (0.0, 1.0)
    num_elements: int = Field(default=32, ge=2, le=100_000)
    conductivity: float = Field(default=1.0, gt=0.0)
    dirichlet: tuple[float, float] = (0.0, 0.0)  # u at (x0, x1)
    forcing: Forcing = Field(default_factory=SineForcing)

    @model_validator(mode="after")
    def _domain_is_increasing(self) -> "Poisson1DModel":
        if not self.domain[1] > self.domain[0]:
            raise ValueError("domain must satisfy x1 > x0")
        return self


class Poisson1DResult(BaseModel):
    """Solver output. Numbers only — presentation is the frontend's job."""

    schema_version: str = SCHEMA_VERSION
    model_kind: Literal["poisson1d_result"] = "poisson1d_result"
    x: list[float]
    u: list[float]
    h: float  # element size
    num_dofs: int
