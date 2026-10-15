# LineCraft Studio

**Local-first image-to-path studio for drawing and food-art machines.**

LineCraft Studio turns uploaded images and hand-traced drawings into editable vector paths that can later be planned for pen plotters, XY CNC devices, sugar painting (糖画), amezaiku-style drawing, pancake art, and food extrusion.

> **Project status: scaffold / early development.** No hardware-control or production-safety claims are made yet.

## Product direction

Start as an independent browser app. Keep image import, manual tracing, vector editing, path planning, simulation, and export separate from any machine-specific communication layer.

### Initial workflow

1. **Import** — raster image or SVG reference.
2. **Convert** — silhouette, contour, line art, centerline (only when feasible), manual trace, or hybrid.
3. **Edit** — select, draw, erase, edit nodes, join/split paths.
4. **Plan** — choose units, work area, origin, path order, draw/travel moves, and tool profile.
5. **Preview** — inspect the planned paths and validation warnings.
6. **Export** — SVG first; DXF and machine-profile-specific G-code as later validated capabilities.

## Architecture principles

- Browser-first and local-first: reference images should not need to leave the device.
- Manual tracing and deterministic geometry come before optional AI features.
- Preserve the original image separately from derived geometry.
- A contour is not the same as a centerline; do not silently substitute one for the other.
- Unknown dimensions, machine capabilities, and G-code dialects remain explicit and must not be guessed.
- Simulator output is not evidence that a real machine job is safe.
- Keep the app independent from NeriCore/KataCore initially; design clean interfaces so future adapters can be considered without coupling the MVP to those projects.

## Planned modules

- `apps/web` — React + TypeScript editor and workspace.
- `packages/drawing-model` — versioned `DrawingJob` types and geometry contracts.
- `packages/geometry` — deterministic path utilities and validation.
- `packages/exporters` — SVG first; DXF/G-code behind explicit capability profiles.
- `apps/local-bridge` — future optional local service for machine communication, bound to loopback and protected against cross-origin command abuse.
- `docs` — architecture, roadmap, decisions, and acceptance tests.

## Development status

The repository is being bootstrapped. See [the architecture](docs/ARCHITECTURE.md), [the roadmap](docs/ROADMAP.md), and [the MVP acceptance criteria](docs/MVP_ACCEPTANCE.md) as they are added.

## Safety boundary

Until a real machine adapter and its profile are implemented and tested, the app must remain in browser preview / simulator mode. Never run exported G-code on a real machine without verifying the machine model, dialect, coordinate system, working limits, tool behavior, and emergency-stop procedure.
