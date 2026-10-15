import * as THREE from 'three';
import './style.css';

const API_BASE = 'http://127.0.0.1:8765';
const fileInput = document.querySelector('#source-file');
const imageCanvas = document.querySelector('#image-preview');
const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
const emptyImage = document.querySelector('#empty-image');
const empty3D = document.querySelector('#empty-3d');
const status = document.querySelector('#source-status');
const exportStatus = document.querySelector('#export-status');
const exportButton = document.querySelector('#export');
const reliefInput = document.querySelector('#relief');
const baseInput = document.querySelector('#base');
const invertInput = document.querySelector('#invert');
const widthInput = document.querySelector('#width');
const depthInput = document.querySelector('#depth');
const dims = document.querySelector('#dimensions');
const threeHost = document.querySelector('#three-view');

let sourceFile = null;
let sourceImageData = null;
let scalarValues = null;
let scene, camera, renderer, controls, surface, resizeObserver;

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f3ed');
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
  camera.position.set(75, -95, 85);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(threeHost.clientWidth, threeHost.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  threeHost.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b9388, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-60, -80, 120);
  scene.add(key);
  const grid = new THREE.GridHelper(100, 10, 0xb8c2b4, 0xd9ddd4);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.2;
  scene.add(grid);
  // Lightweight orbit controls are implemented locally to avoid runtime CDN dependencies.
  const orbit = { dragging: false, x: 0, y: 0, theta: -0.9, phi: 1.0, radius: 145 };
  function updateCamera() {
    orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, orbit.phi));
    camera.position.set(
      orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
      orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.radius * Math.cos(orbit.phi)
    );
    camera.lookAt(0, 0, 0);
  }
  renderer.domElement.addEventListener('pointerdown', (e) => {
    orbit.dragging = true; orbit.x = e.clientX; orbit.y = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!orbit.dragging) return;
    orbit.theta += (e.clientX - orbit.x) * 0.008;
    orbit.phi -= (e.clientY - orbit.y) * 0.008;
    orbit.x = e.clientX; orbit.y = e.clientY; updateCamera();
  });
  renderer.domElement.addEventListener('pointerup', () => { orbit.dragging = false; });
  renderer.domElement.addEventListener('pointercancel', () => { orbit.dragging = false; });
  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault(); orbit.radius = Math.max(30, Math.min(500, orbit.radius + e.deltaY * 0.12)); updateCamera();
  }, { passive: false });
  updateCamera();
  resizeObserver = new ResizeObserver(() => {
    const w = threeHost.clientWidth, h = threeHost.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  });
  resizeObserver.observe(threeHost);
  function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
  animate();
}

function getCurrentScalar() {
  if (!sourceImageData) return null;
  const { data, width, height } = sourceImageData;
  const values = new Float32Array(width * height);
  const inverted = invertInput.checked;
  for (let i = 0; i < values.length; i++) {
    const p = i * 4;
    const gray = (data[p] * 0.2126 + data[p + 1] * 0.7152 + data[p + 2] * 0.0722) / 255;
    values[i] = inverted ? 1 - gray : gray;
  }
  return values;
}

function renderScalarMap() {
  if (!sourceImageData) return;
  scalarValues = getCurrentScalar();
  const { width, height } = sourceImageData;
  const output = imageCtx.createImageData(width, height);
  for (let i = 0; i < scalarValues.length; i++) {
    const v = Math.round(scalarValues[i] * 255), p = i * 4;
    output.data[p] = output.data[p + 1] = output.data[p + 2] = v;
    output.data[p + 3] = 255;
  }
  imageCanvas.width = width; imageCanvas.height = height;
  imageCtx.putImageData(output, 0, 0);
  dims.textContent = width + ' × ' + height + ' px';
  emptyImage.hidden = true;
  drawSurface();
}

function drawSurface() {
  if (!scalarValues || !scene) return;
  if (surface) {
    scene.remove(surface);
    surface.geometry.dispose();
    surface.material.dispose();
  }
  const { width, height } = sourceImageData;
  const stride = Math.max(1, Math.ceil(Math.max(width, height) / 180));
  const cols = Math.ceil((width - 1) / stride) + 1;
  const rows = Math.ceil((height - 1) / stride) + 1;
  const positions = [];
  const indices = [];
  const relief = Number(reliefInput.value);
  const base = Number(baseInput.value);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.min(width - 1, c * stride);
      const sy = Math.min(height - 1, r * stride);
      const z = base + scalarValues[sy * width + sx] * relief;
      positions.push((sx / Math.max(1, width - 1) - 0.5) * 100,
        (0.5 - sy / Math.max(1, height - 1)) * 100, z);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: '#a7c49c', roughness: 0.86, metalness: 0, side: THREE.DoubleSide
  }));
  scene.add(surface);
  empty3D.hidden = true;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    status.textContent = 'File too large. Maximum size is 20 MB.'; return;
  }
  sourceFile = file;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(2, Math.round(image.naturalWidth * scale));
    const h = Math.max(2, Math.round(image.naturalHeight * scale));
    const temp = document.createElement('canvas');
    temp.width = w; temp.height = h;
    const ctx = temp.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    sourceImageData = ctx.getImageData(0, 0, w, h);
    URL.revokeObjectURL(url);
    status.textContent = file.name + ' · source preserved · preview capped at 1000 px';
    exportStatus.textContent = 'Preview ready. Review polarity and dimensions before export.';
    exportButton.disabled = false;
    renderScalarMap();
  };
  image.onerror = () => { status.textContent = 'Could not read this image. Try PNG, JPEG, or WebP.'; URL.revokeObjectURL(url); };
  image.src = url;
});

reliefInput.addEventListener('input', () => {
  document.querySelector('#relief-value').textContent = reliefInput.value + ' mm';
  drawSurface();
});
baseInput.addEventListener('input', () => {
  document.querySelector('#base-value').textContent = baseInput.value + ' mm';
  drawSurface();
});
invertInput.addEventListener('change', renderScalarMap);

exportButton.addEventListener('click', async () => {
  if (!sourceFile) return;
  exportButton.disabled = true;
  exportStatus.textContent = 'Generating and validating solid locally…';
  try {
    const blob = await new Promise((resolve, reject) => {
      imageCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Could not prepare scalar image.')), 'image/png');
    });
    const form = new FormData();
    form.append('file', blob, 'scalar-field.png');
    form.append('width_mm', String(Number(widthInput.value)));
    form.append('depth_mm', String(Number(depthInput.value)));
    form.append('relief_mm', reliefInput.value);
    form.append('base_mm', baseInput.value);
    form.append('invert', 'false'); // Polarity is already applied to the displayed/exported scalar image.
    const response = await fetch(API_BASE + '/api/export/stl', { method: 'POST', body: form });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || 'Export failed. Check that the local Python service is running.');
    }
    const stl = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(stl);
    link.download = 'conversion-lab-mm.stl';
    link.click();
    URL.revokeObjectURL(link.href);
    exportStatus.textContent = 'STL generated. Confirm dimensions and validate again in your CAD/mesh tool before manufacturing.';
  } catch (error) {
    exportStatus.textContent = error.message || 'Could not export. Start the local Python API and try again.';
  } finally {
    exportButton.disabled = false;
  }
});

initThree();
