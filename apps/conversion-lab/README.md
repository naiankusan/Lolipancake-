# Representation Conversion Lab

An experimental, separate workspace inside LineCraft Studio. This folder does not replace the existing image-to-path workflow.

## MVP target

Build one deterministic, offline-first vertical slice:

1. Import PNG, JPEG, WebP, or SVG in the browser.
2. Preserve the source file; create a grayscale derivative only when requested.
3. Preview the scalar field as a 2D image and a Three.js height surface.
4. Adjust relief height, base thickness, and polarity explicitly.
5. Export a watertight STL through the local Python API.

## Runtime architecture

- `frontend/`: Vite + TypeScript + Three.js. Three.js is a package dependency, not a runtime CDN dependency.
- `backend/`: FastAPI + Pillow + NumPy + Trimesh.
- The browser owns source selection and interactive preview. Python owns deterministic mesh generation and mesh validation.
- No AI model is required for this MVP. No image is uploaded to a remote service.

## Local development

Prerequisites: Python 3.11+ and Node.js 20+.

Backend:

```bash
cd apps/conversion-lab/backend
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8765
```

Frontend:

```bash
cd apps/conversion-lab/frontend
npm install
npm run dev
```

The frontend expects the local API at `http://127.0.0.1:8765` during development. Keep the backend bound to loopback; do not expose it to the LAN.

## Important semantics

- Grayscale intensity is only a scalar value until the user assigns a meaning to it.
- “Invert” is a polarity operation, not a depth-estimation operation.
- STL has no intrinsic unit metadata. The export dialog and filename must state the chosen millimetre dimensions.
- Mesh export must fail with a readable validation error if a watertight solid cannot be produced.
- Source files are never overwritten by generated derivatives.
