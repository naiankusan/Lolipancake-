import { useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import {
  ArrowDownToLine, Check, CircleHelp, FileImage, FilePlus2, Hand, Image as ImageIcon,
  Layers, MousePointer2, Redo2, RotateCcw, Save, Undo2, WandSparkles, X,
} from "lucide-react";
import { createEmptyDocument, type DrawingDocument, type Point2D, type VectorPath } from "../../../packages/drawing-model/src";

type Tool = "select" | "draw";
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;

function pathData(points: Point2D[]): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [documentModel, setDocumentModel] = useState<DrawingDocument>(() => createEmptyDocument());
  const [paths, setPaths] = useState<VectorPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState(0.38);
  const [showReference, setShowReference] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [notice, setNotice] = useState("Ready to trace. Your files stay in this browser.");
  const [undoStack, setUndoStack] = useState<VectorPath[][]>([]);
  const [redoStack, setRedoStack] = useState<VectorPath[][]>([]);
  const [activePoints, setActivePoints] = useState<Point2D[] | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef(false);

  const totalPoints = useMemo(() => paths.reduce((sum, path) => sum + path.points.length, 0), [paths]);
  const selectedPath = paths.find((path) => path.id === selectedId) ?? null;

  function updatePaths(next: VectorPath[]) {
    setUndoStack((stack) => [...stack, paths]);
    setRedoStack([]);
    setPaths(next);
  }

  function pointFromEvent(event: PointerEvent<SVGSVGElement>): Point2D {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(VIEW_WIDTH, ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH)),
      y: Math.max(0, Math.min(VIEW_HEIGHT, ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT)),
    };
  }

  function startPath(event: PointerEvent<SVGSVGElement>) {
    if (tool !== "draw" || event.button !== 0) {
      if (tool === "select") setSelectedId(null);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setActivePoints([pointFromEvent(event)]);
  }

  function extendPath(event: PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return;
    const nextPoint = pointFromEvent(event);
    setActivePoints((current) => {
      if (!current) return [nextPoint];
      const previous = current[current.length - 1];
      const distance = Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y);
      return distance < 1.5 ? current : [...current, nextPoint];
    });
  }

  function finishPath() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setActivePoints((current) => {
      if (current && current.length > 1) {
        const nextPath: VectorPath = {
          id: crypto.randomUUID(),
          semantic: "manual",
          points: current,
          closed: false,
        };
        updatePaths([...paths, nextPath]);
        setSelectedId(nextPath.id);
        setNotice("Path added.");
      } else {
        setNotice("Short strokes are ignored. Draw a little farther to create a path.");
      }
      return null;
    });
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setNotice("Unsupported file. Choose PNG, JPEG, WebP, or SVG.");
      event.target.value = "";
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setNotice("This MVP accepts reference files up to 15 MB.");
      event.target.value = "";
      return;
    }
    if (referenceUrl) URL.revokeObjectURL(referenceUrl);
    setReferenceUrl(URL.createObjectURL(file));
    setReferenceName(file.name);
    setShowReference(true);
    setNotice(`Reference loaded: ${file.name}`);
    event.target.value = "";
  }

  function exportSvg() {
    if (paths.length === 0) {
      setNotice("Add at least one path before exporting SVG.");
      return;
    }
    const body = paths.map((path) =>
      `  <path d="${pathData(path.points)}" fill="none" stroke="#171717" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
    ).join("\n");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${documentModel.width}mm" height="${documentModel.height}mm" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}">\n${body}\n</svg>\n`;
    downloadText("linecraft-drawing.svg", svg, "image/svg+xml;charset=utf-8");
    setNotice("SVG exported without embedding the reference image.");
  }

  function saveProject() {
    const project = {
      schemaVersion: documentModel.schemaVersion,
      document: { ...documentModel, paths, updatedAt: new Date().toISOString() },
      canvas: { viewWidth: VIEW_WIDTH, viewHeight: VIEW_HEIGHT, strokeWidth },
      reference: { filename: referenceName, embedded: false },
    };
    downloadText("linecraft-project.json", JSON.stringify(project, null, 2), "application/json;charset=utf-8");
    setNotice("Project JSON saved. The reference image itself is not embedded.");
  }

  function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const candidate = parsed.document;
        if (!candidate || !Array.isArray(candidate.paths) || candidate.schemaVersion !== "0.1.0") {
          throw new Error("Unsupported project schema");
        }
        const valid = candidate.paths.every((path: VectorPath) =>
          typeof path.id === "string" && Array.isArray(path.points) &&
          path.points.every((point: Point2D) => Number.isFinite(point.x) && Number.isFinite(point.y)),
        );
        if (!valid) throw new Error("Invalid path data");
        setDocumentModel({ ...createEmptyDocument(), ...candidate });
        setPaths(candidate.paths);
        setSelectedId(null);
        setUndoStack([]);
        setRedoStack([]);
        if (Number.isFinite(parsed.canvas?.strokeWidth)) setStrokeWidth(parsed.canvas.strokeWidth);
        setNotice(`Project opened: ${file.name}`);
      } catch {
        setNotice("Could not open this project. Check that it is a valid LineCraft project JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function undo() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [...stack, paths]);
    setPaths(previous);
    setUndoStack((stack) => stack.slice(0, -1));
    setSelectedId(null);
    setNotice("Undo.");
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((stack) => [...stack, paths]);
    setPaths(next);
    setRedoStack((stack) => stack.slice(0, -1));
    setSelectedId(null);
    setNotice("Redo.");
  }

  function deleteSelected() {
    if (!selectedId) return;
    updatePaths(paths.filter((path) => path.id !== selectedId));
    setSelectedId(null);
    setNotice("Selected path deleted.");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="brand-icon">L</span><div><strong>LineCraft <span>Studio</span></strong><small>IMAGE → PATH WORKSPACE</small></div></div>
        <div className="top-actions">
          <button className="button subtle" onClick={() => projectInputRef.current?.click()}><FilePlus2 size={16} /> Open project</button>
          <button className="button subtle" onClick={undo} disabled={!undoStack.length} aria-label="Undo"><Undo2 size={16} /></button>
          <button className="button subtle" onClick={redo} disabled={!redoStack.length} aria-label="Redo"><Redo2 size={16} /></button>
          <button className="button subtle" onClick={saveProject}><Save size={16} /> Save</button>
          <button className="button primary" onClick={exportSvg}><ArrowDownToLine size={16} /> Export SVG</button>
        </div>
      </header>

      <div className="app-body">
        <aside className="left-rail">
          <div className="rail-label">TOOLS</div>
          <button className={`tool-button ${tool === "select" ? "active" : ""}`} onClick={() => setTool("select")} title="Select paths"><MousePointer2 size={19} /><span>Select</span></button>
          <button className={`tool-button ${tool === "draw" ? "active" : ""}`} onClick={() => setTool("draw")} title="Draw a path"><WandSparkles size={19} /><span>Trace</span></button>
          <div className="rail-divider" />
          <button className="tool-button" onClick={() => imageInputRef.current?.click()} title="Import reference"><ImageIcon size={19} /><span>Image</span></button>
          <button className="tool-button" onClick={deleteSelected} disabled={!selectedId} title="Delete selected path"><X size={19} /><span>Delete</span></button>
          <div className="rail-bottom"><CircleHelp size={18} /><span>Preview<br />mode</span></div>
        </aside>

        <main className="workspace">
          <div className="workspace-heading">
            <div><div className="eyebrow">WORKSPACE / MANUAL TRACE</div><h1>Turn a picture into a path.</h1><p>Load a reference, trace its important lines, then export clean SVG geometry.</p></div>
            <div className="mode-pill"><span /> Browser-only · No machine connected</div>
          </div>

          <section className="canvas-card">
            <div className="canvas-toolbar">
              <div className="canvas-file"><Layers size={16} /><span>{referenceName ?? "Untitled drawing"}</span>{referenceName && <button className="icon-button" onClick={() => { if (referenceUrl) URL.revokeObjectURL(referenceUrl); setReferenceUrl(null); setReferenceName(null); }} title="Remove reference"><X size={14} /></button>}</div>
              <div className="canvas-tools"><span className={`status-tag ${tool === "draw" ? "status-draw" : ""}`}>{tool === "draw" ? "TRACE TOOL" : "SELECT TOOL"}</span><button className="icon-button" onClick={() => { setPaths([]); setSelectedId(null); setUndoStack([]); setRedoStack([]); setNotice("Canvas cleared."); }} title="Clear paths"><RotateCcw size={15} /></button></div>
            </div>
            <div className="canvas-stage">
              <div className="canvas-paper">
                <svg ref={canvasRef} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="Drawing canvas" onPointerDown={startPath} onPointerMove={extendPath} onPointerUp={finishPath} onPointerCancel={finishPath} className={tool === "draw" ? "drawing-cursor" : "selecting-cursor"}>
                  {showReference && referenceUrl && <image href={referenceUrl} x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} opacity={referenceOpacity} preserveAspectRatio="xMidYMid meet" pointerEvents="none" />}
                  {paths.map((path) => <path key={path.id} d={pathData(path.points)} fill="none" stroke={path.id === selectedId ? "#dc6b46" : "#222222"} strokeWidth={path.id === selectedId ? strokeWidth + 1 : strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { if (tool === "select") { event.stopPropagation(); setSelectedId(path.id); } }} />)}
                  {activePoints && <path d={pathData(activePoints)} fill="none" stroke="#dc6b46" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                </svg>
                {!referenceUrl && paths.length === 0 && <div className="empty-canvas"><div className="empty-icon"><FileImage size={27} /></div><strong>Your canvas is waiting.</strong><p>Import a picture, or start tracing from scratch.</p><button className="button primary" onClick={() => imageInputRef.current?.click()}><ImageIcon size={16} /> Import reference</button><span>PNG · JPEG · WebP · SVG</span></div>}
              </div>
            </div>
            <div className="canvas-footer"><div><span className="footer-dot" /> {notice}</div><span>{VIEW_WIDTH} × {VIEW_HEIGHT} viewBox</span></div>
          </section>

          <div className="bottom-hint"><Hand size={15} /><span>Tip: choose <b>Trace</b> and drag across the canvas to create a vector path. Choose <b>Select</b> to select a path before deleting it.</span></div>
        </main>

        <aside className="inspector">
          <div className="inspector-title"><div><span className="eyebrow">SETTINGS</span><h2>Inspector</h2></div><span className="inspector-spark">✳</span></div>
          <section className="inspector-section">
            <h3><ImageIcon size={15} /> Reference image</h3>
            <button className="upload-zone" onClick={() => imageInputRef.current?.click()}><FileImage size={21} /><strong>{referenceName ? "Replace reference" : "Choose an image"}</strong><span>PNG, JPG, WebP or SVG · up to 15 MB</span></button>
            <label className="toggle-row"><span>Show reference</span><input type="checkbox" checked={showReference} onChange={(event) => setShowReference(event.target.checked)} disabled={!referenceUrl} /></label>
            <label className="range-label"><span>Reference opacity</span><b>{Math.round(referenceOpacity * 100)}%</b></label>
            <input className="range" type="range" min="5" max="100" value={referenceOpacity * 100} onChange={(event) => setReferenceOpacity(Number(event.target.value) / 100)} disabled={!referenceUrl || !showReference} />
          </section>
          <section className="inspector-section">
            <h3><WandSparkles size={15} /> Path style</h3>
            <label className="range-label"><span>Preview stroke width</span><b>{strokeWidth}px</b></label>
            <input className="range" type="range" min="1" max="8" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} />
            <p className="small-note">This controls the on-screen stroke and exported SVG stroke. It is not a physical tool-width setting.</p>
          </section>
          <section className="inspector-section">
            <h3><Check size={15} /> Document</h3>
            <div className="stat-grid"><div><span>Paths</span><strong>{paths.length}</strong></div><div><span>Points</span><strong>{totalPoints}</strong></div></div>
            <div className="document-row"><span>Document size</span><b>{documentModel.width} × {documentModel.height} mm</b></div>
            <div className="document-row"><span>Selected path</span><b>{selectedPath ? selectedPath.id.slice(0, 8) : "None"}</b></div>
          </section>
          <section className="inspector-section validation-box">
            <div className="validation-icon"><Check size={16} /></div><div><strong>Local preview only</strong><p>Paths are editable vector data. No machine commands are sent in this version.</p></div>
          </section>
          <div className="inspector-bottom"><span className="local-lock">◈</span><span>Local-first workspace<br /><b>Files stay in your browser</b></span></div>
        </aside>
      </div>

      <footer className="app-footer"><span>LineCraft Studio <b>0.1.0 · early preview</b></span><span>Manual trace <i /> Vector paths <i /> SVG export</span></footer>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={handleImageUpload} />
      <input ref={projectInputRef} type="file" accept="application/json,.json" hidden onChange={loadProject} />
    </div>
  );
}
