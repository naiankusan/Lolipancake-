# Roadmap

## Phase 0 — Repository foundation
- [x] Establish project purpose and safety boundaries.
- [x] Define module boundaries and initial workflow.
- [ ] Add web app scaffold and automated checks.
- [ ] Add a versioned drawing model.
- [ ] Record implementation status honestly.

## Phase 1 — Browser editor MVP
- [ ] React + TypeScript workspace builds and runs.
- [ ] Import PNG, JPEG, WebP, and SVG reference files.
- [ ] Keep the original reference separate from editable geometry.
- [ ] Canvas zoom and pan.
- [ ] Manual freehand and point/curve path creation.
- [ ] Basic selection, delete, undo/redo.
- [ ] Save/open a local project file.
- [ ] Export editable paths to SVG.
- [ ] No backend or cloud upload required.

## Phase 2 — Path editing and planning
- [ ] Node selection and editing.
- [ ] Join/split paths where valid.
- [ ] Document units and physical dimensions.
- [ ] Work area, origin, and out-of-bounds validation.
- [ ] Draw versus travel move visualization.
- [ ] Path order and direction controls.
- [ ] Estimated path length and operation count.

## Phase 3 — Image conversion
- [ ] Adjustable threshold and contour extraction.
- [ ] Simplification with before/after preview.
- [ ] Preserve the original image as a separate layer.
- [ ] Clearly label contour versus centerline modes.
- [ ] Centerline conversion only when a tested algorithm is available.
- [ ] Human review before replacing or exporting derived geometry.

## Phase 4 — Simulator and export profiles
- [ ] Deterministic simulator for XY movement and tool on/off.
- [ ] Pause, resume, stop, progress, and bounds errors.
- [ ] SVG exporter fully tested.
- [ ] DXF exporter only after unit/curve handling is specified.
- [ ] G-code exporter only for an explicit dialect/profile.
- [ ] Validate output against golden fixtures.

## Phase 5 — Optional Windows Local Bridge
- [ ] Separate Python service/package from the browser app.
- [ ] Loopback-only listener and authenticated control endpoints.
- [ ] Device adapter interface and status reporting.
- [ ] Simulator adapter first.
- [ ] Portable Windows packaging and clear start/stop instructions.
- [ ] No real hardware support until protocol and device are known.

## Phase 6 — First real machine adapter
- [ ] Select a specific device and document its protocol.
- [ ] Implement only declared supported commands.
- [ ] Test bounds, disconnects, pause/stop, and error recovery.
- [ ] Require machine-profile selection and preflight confirmation.

## Out of scope for the first MVP
- Automatic AI image reconstruction.
- Cloud accounts or image upload.
- Direct machine control from the browser.
- Claiming generic G-code works on all CNC/plotter devices.
- Food-safe certification or automatic assumptions about food extrusion.
- Tight coupling to NeriCore or KataCore.
