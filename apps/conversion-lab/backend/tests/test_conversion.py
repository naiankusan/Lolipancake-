from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app, heightfield_to_solid

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_heightfield_generates_watertight_solid():
    field = np.array([[0.0, 0.25, 0.5], [0.25, 0.5, 0.75], [0.5, 0.75, 1.0]])
    mesh = heightfield_to_solid(field, 20, 20, 5, 2)
    assert mesh.is_watertight
    assert mesh.bounds[0][2] == 0
    assert mesh.bounds[1][2] == 7


def test_export_rejects_invalid_upload():
    response = client.post(
        "/api/export/stl",
        files={"file": ("bad.png", b"not an image", "image/png")},
    )
    assert response.status_code == 422


def test_export_stl_from_png():
    buffer = BytesIO()
    Image.fromarray(np.array([[0, 64, 128], [64, 128, 192], [128, 192, 255]], dtype=np.uint8)).save(buffer, format="PNG")
    response = client.post(
        "/api/export/stl",
        files={"file": ("height.png", buffer.getvalue(), "image/png")},
        data={"width_mm": "20", "depth_mm": "20", "relief_mm": "5", "base_mm": "2", "invert": "false"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "model/stl"
    assert response.content[:5] == b"solid" or len(response.content) > 84
