# utils/convert_dwg_to_svg.py
from ssl import AlertDescription
import subprocess
import tempfile
import shutil
import os
from pathlib import Path


def find_odafc():
    """Locate ODAFileConverter on system"""
    candidates = [
        "ODAFileConverter.exe", "ODAFileConverter", "odafileconverter", "odafc"
    ]
    for name in candidates:
        p = shutil.which(name)
        if p:
            return p
    possible = [
        #"./ODAFileConverter",           # The symlink we created
        "./ODAFileConverter.AppImage",  # The actual AppImage file
        "ODAFileConverter",             # If it's in PATH
        "odafileconverter",             # Lowercase
        ]
    for p in possible:
        if os.path.exists(p):
            print(f"Found at path: {p}")
            # Check if it's executable
            if os.access(p, os.X_OK):
                print(f"File is executable: {p}")
            else:
                print(f"File is NOT executable: {p}")
            
            return p
    return None

def odafc_convert(odafc_path: str, input_dwg: Path, out_dxf: Path):
    """Convert DWG -> DXF using ODA File Converter"""
    input_dwg = Path(input_dwg).resolve()
    out_dxf = Path(out_dxf).resolve()

    with tempfile.TemporaryDirectory() as src_dir, tempfile.TemporaryDirectory() as dst_dir:
        src_dir, dst_dir = Path(src_dir), Path(dst_dir)
        shutil.copy2(str(input_dwg), src_dir / input_dwg.name)
        

        cmd = [
            str(odafc_path), str(src_dir), str(dst_dir),
            "ACAD2013", "DXF", "0", "1", input_dwg.name
        ]
        subprocess.run(cmd, check=True)

        dxf_files = list(dst_dir.rglob("*.dxf"))
        if not dxf_files:
            raise RuntimeError("No DXF produced by ODA.")
        shutil.copy2(str(dxf_files[0]), str(out_dxf))
        return out_dxf

def dxf_to_svg(dxf_path, svg_path):
    """Convert DXF -> SVG using ezdxf"""
    import ezdxf
    from ezdxf.addons.drawing import RenderContext, Frontend, svg, layout

    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()
    ctx = RenderContext(doc)
    backend = svg.SVGBackend()
    fe = Frontend(ctx, backend)
    fe.draw_layout(msp)

    page = layout.Page(210, 297, layout.Units.mm, margins=layout.Margins.all(20))
    svg_string = backend.get_string(page)
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_string)
    return svg_path

def dwg_to_svg(dwg_file: Path, svg_file: Path, odafc: str | None = None):
    """High-level wrapper: DWG -> DXF -> SVG"""
    odafc = odafc or find_odafc()
    
    if not odafc:
        raise RuntimeError("ODAFileConverter not found. Provide path or install it.")
    print("Your are using: ", odafc)
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_dxf = Path(tmpdir) / "temp.dxf"
        odafc_convert(odafc, dwg_file, tmp_dxf)
        return dxf_to_svg(tmp_dxf, svg_file)