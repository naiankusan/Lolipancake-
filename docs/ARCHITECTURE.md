# Architecture

## 1. Product boundary

LineCraft Studio is an independent browser-first drawing-to-path application. The first release is useful without a machine attached: users can import a reference, trace/edit paths, inspect path order, simulate drawing, and export SVG.

The Local Bridge is a later, optional companion process. It must not be required for the editor or simulator to work.

## 2. Pipeline

```text
Raster / SVG Reference
        |
        v
Import + Normalize (preserve original)
        |
        +---- Manual Trace
        +---- Threshold / Contour (later)
        +---- Centerline (only when supported)
        |
        v
Editable Vector Document
        |
        v
DrawingJob (unit-aware, versioned)
        |
        v
Path Planner (order, direction, travel moves, limits)
        |
        +---- Preview / Simulator
        +---- SVG Export (first)
        +---- DXF Export (later)
        +---- G-code Export (only with explicit profile)
        |
        v
Optional Local Bridge (future)
        |
        v
Machine Adapter (future; explicit capabilities)
```

## 3. Separation of concerns

- **Web UI:** import, canvas, manual tracing, node editing, project state, previews, export controls.
- **Drawing model:** canonical data contract between editor, planner, simulator, and exporters.
- **Geometry:** deterministic path operations. It must not contain UI state or machine I/O.
- **Planner:** transforms editable paths into ordered operations and explicit travel/draw segments.
- **Exporter:** serializes a validated job to a named format. Exporting is not equivalent to validating a physical machine job.
- **Local Bridge:** future localhost-only process for device discovery and communication. It does not interpret drawings or silently alter geometry.
- **Machine adapter:** declares supported commands, units, bounds, feed limits, tool controls, and dialect. Unsupported features must fail validation rather than be guessed.

## 4. Geometry semantics

Keep these concepts distinct:

- **Reference image:** original uploaded pixels; immutable unless the user explicitly replaces it.
- **Contour:** boundary of a region or silhouette.
- **Centerline:** one path intended to follow the middle of a stroke or feature. It cannot be inferred reliably from every image.
- **Editable path:** user-controlled vector geometry.
- **Planned operation:** a path with process/tool intent and execution order.
- **Travel move:** non-drawing movement between drawing operations.
- **Draw move:** movement that applies the selected tool/process.

Do not convert a thick painted region into a centerline without telling the user what algorithm was used and exposing the result for review.

## 5. DrawingJob contract (initial direction)

A versioned job should eventually carry:

- schema version and job ID;
- source reference metadata, without embedding sensitive file paths;
- document dimensions and units;
- editable vector paths with stable IDs and path semantics;
- planner output with operation order and explicit draw/travel moves;
- coordinate system and origin;
- tool/process profile;
- working area and constraints;
- validation results;
- provenance/transformation history.

The first code implementation should define strict TypeScript types and runtime validation for the fields it actually supports. Do not claim fields are implemented merely because they appear in this document. Optional/unavailable information should remain absent or explicitly unknown.

## 6. Local Bridge security (future)

- Bind only to loopback interfaces by default.
- Require an unpredictable per-session token for control endpoints.
- Validate Origin and reject browser requests from unapproved origins.
- Do not expose a generic arbitrary-command endpoint.
- Separate read-only status from machine-control permissions.
- Require explicit user action to connect/start; provide pause/stop and visible state.
- Validate jobs against the selected machine profile immediately before execution.
- Never report a simulated connection as a real device connection.

## 7. Dependency policy

Start with a small React + TypeScript app and Canvas/SVG primitives. Add a geometry library only after an MVP requirement demonstrates the need. AI-assisted vectorization is optional and must not be a prerequisite for manual trace, editing, planning, or SVG export.

NeriCore/KataCore are not runtime dependencies for this prototype. Future integration requires a separate decision and explicit interface contract.
