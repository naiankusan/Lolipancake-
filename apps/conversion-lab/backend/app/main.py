from __future__ import annotations

from io import BytesIO

import numpy as np
import trimesh
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from starlette.responses import Response

app = FastAPI(title="Representation Conversion Lab API", version="0.1.0")
ALLOWED_ORIGINS = {"http://127.0.0.1:5173", "http://localhost:5173"}

# CORS is not a CSRF defense by itself; the middleware below also rejects
# disallowed browser Origin headers on state-changing requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_PIXELS = 1_000_000


@app.middleware("http")
async def restrict_browser_origins(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method == "POST" and origin and origin not in ALLOWED_ORIGINS:
        return Response("Origin not allowed by local Conversion Lab API.", status_code=403)
    return await call_next(request)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "representation-conversion-lab"}


def _read_grayscale(upload_bytes: bytes) -> np.ndarray:
    if not upload_bytes:
        raise ValueError("The uploaded image is empty.")
    if len(upload_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Image exceeds the 20 MB upload limit.")
    try:
        with Image.open(BytesIO(upload_bytes)) as image:
            image = ImageOps.exif_transpose(image).convert("L")
            if image.width * image.height > MAX_PIXELS:
                image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
            return np.asarray(image, dtype=np.float32) / 255.0
    except (OSError, Image.DecompressionBombError) as exc:
        raise ValueError("Unsupported or invalid image. Use a valid PNG, JPEG, or WebP file.") from exc


def heightfield_to_solid(
    field: np.ndarray,
    width_mm: float,
    depth_mm: float,
    relief_mm: float,
    base_mm: float,
) -> trimesh.Trimesh:
    """Create a closed grid-based solid. Row zero maps to positive Y."""
    if field.ndim != 2 or min(field.shape) < 2:
        raise ValueError("Height field must be a 2D grid at least 2 × 2 pixels.")
    if not np.isfinite(field).all():
        raise ValueError("Height field contains non-finite values.")
    if not all(np.isfinite(v) for v in (width_mm, depth_mm, relief_mm, base_mm)):
        raise ValueError("Dimensions must be finite numbers.")
    if not (0.1 <= width_mm <= 500 and 0.1 <= depth_mm <= 500):
        raise ValueError("Width and depth must be between 0.1 and 500 mm.")
    if not (0.01 <= relief_mm <= 100 and 0.1 <= base_mm <= 100):
        raise ValueError("Relief must be 0.01–100 mm and base thickness 0.1–100 mm.")

    rows, cols = field.shape
    xs = np.linspace(-width_mm / 2, width_mm / 2, cols)
    ys = np.linspace(depth_mm / 2, -depth_mm / 2, rows)
    xx, yy = np.meshgrid(xs, ys)
    zz = base_mm + np.clip(field, 0.0, 1.0) * relief_mm
    top = np.column_stack((xx.ravel(), yy.ravel(), zz.ravel()))
    bottom = np.column_stack((xx.ravel(), yy.ravel(), np.zeros(rows * cols)))
    vertices = np.vstack((top, bottom))
    offset = rows * cols
    faces: list[tuple[int, int, int]] = []

    def idx(r: int, c: int) -> int:
        return r * cols + c

    for r in range(rows - 1):
        for c in range(cols - 1):
            a, b, d, e = idx(r, c), idx(r, c + 1), idx(r + 1, c), idx(r + 1, c + 1)
            faces.extend([(a, d, b), (b, d, e)])
            faces.extend([(offset + a, offset + b, offset + d),
                          (offset + b, offset + e, offset + d)])

    boundary = (
        [idx(0, c) for c in range(cols)]
        + [idx(r, cols - 1) for r in range(1, rows)]
        + [idx(rows - 1, c) for c in range(cols - 2, -1, -1)]
        + [idx(r, 0) for r in range(rows - 2, 0, -1)]
    )
    for i, a in enumerate(boundary):
        b = boundary[(i + 1) % len(boundary)]
        faces.extend([(a, b, offset + a), (b, offset + b, offset + a)])

    mesh = trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces), process=True)
    mesh.remove_unreferenced_vertices()
    if not mesh.is_watertight:
        raise ValueError("Generated mesh failed watertight validation; export was stopped.")
    return mesh


@app.post("/api/export/stl")
async def export_stl(
    file: UploadFile = File(...),
    width_mm: float = Form(60.0),
    depth_mm: float = Form(60.0),
    relief_mm: float = Form(8.0),
    base_mm: float = Form(2.0),
    invert: bool = Form(False),
) -> Response:
    if file.content_type not in {"image/png", "image/jpeg", "image/webp", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, or WebP scalar image.")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    try:
        field = _read_grayscale(raw)
        if invert:
            field = 1.0 - field
        mesh = heightfield_to_solid(field, width_mm, depth_mm, relief_mm, base_mm)
        stl = mesh.export(file_type="stl")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Mesh generation failed. No file was exported.") from exc

    return Response(
        content=stl,
        media_type="model/stl",
        headers={"Content-Disposition": 'attachment; filename="conversion-lab-mm.stl"'},
    )
