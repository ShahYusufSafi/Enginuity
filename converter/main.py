# We create a pipeline between converter and backend 

# # We need post and get methods using fastAPI
from pathlib import Path
from unittest.mock import patch
from Converter import dwg_to_svg 
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
import shutil
import tempfile
from fastapi.staticfiles import StaticFiles


# for debuffing
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


app = FastAPI()

# Let's allow frontend endpoint to access this end
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        ],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.mount("/SVGs", StaticFiles(directory="SVGs"), name="SVGs")


@app.post('/upload-dwg-to-svg')
async def converter(file: UploadFile):
    # lets generate a unique id for our file 
    file_id = str(uuid.uuid4())
    # We save it to following
    saveTo = Path(f"SVGs/{file_id}.svg")

    # Create temporary file that auto-deletes
    with tempfile.NamedTemporaryFile(delete=True, suffix=".dwg") as temp_file:
        # Save uploaded DWG to temp file
        shutil.copyfileobj(file.file, temp_file)
        temp_file.flush()  # Ensure all data is written
        
        # Convert DWG -> SVG
        dwg_to_svg(temp_file.name, saveTo)

    return {
        "id": file_id, 
        "svg_url": f"/SVGs/{file_id}.svg"
    }
    # temp_file automatically deleted when 'with' block exits


@app.post('/upload-dwg-to-dxf')
async def dwg_to_dxf_endpoint(file: UploadFile):
    """Edge adapter: DWG in, DXF text out.

    This is the converter's strategic role (see docs/ARCHITECTURE.md §3.4):
    proprietary DWG is converted to open DXF here at the edge, and everything
    downstream (backend /api/import/dxf) speaks DXF only. Swapping ODA for
    another converter later touches this service alone.
    """
    from fastapi import Response
    from Converter import find_odafc, odafc_convert

    odafc = find_odafc()
    if not odafc:
        return {"error": "ODAFileConverter not found in converter container."}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_dwg = Path(tmpdir) / "upload.dwg"
        tmp_dxf = Path(tmpdir) / "upload.dxf"
        with open(tmp_dwg, "wb") as f:
            shutil.copyfileobj(file.file, f)
        try:
            odafc_convert(odafc, tmp_dwg, tmp_dxf)
        except Exception as exc:
            logger.exception("DWG->DXF conversion failed")
            return {"error": f"Conversion failed: {exc}"}
        dxf_bytes = tmp_dxf.read_bytes()

    return Response(
        content=dxf_bytes,
        media_type="application/dxf",
        headers={"Content-Disposition": 'attachment; filename="converted.dxf"'},
    )


@app.get("/test")
def get():
    return "Converter"


@app.get("/debug-odafc")
async def debug_odafc():
    from Converter import find_odafc
    odafc_path = find_odafc()
    return {
        "odafc_path": odafc_path,
        "exists": os.path.exists(odafc_path) if odafc_path else False,
        "executable": os.access(odafc_path, os.X_OK) if odafc_path else False
    }
