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
