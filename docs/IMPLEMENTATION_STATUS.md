# Implementation Status

Last reviewed: 2026-10-15

This file records only the implementation currently present in the repository. A roadmap checkbox is not evidence that a feature is implemented.

| Area | Status | Notes |
|---|---|---|
| Repository purpose and boundaries | IMPLEMENTED | See README and architecture notes. |
| React + TypeScript workspace | SCAFFOLDED | Package and Vite configuration committed; CI/build result still needs confirmation. |
| Manual trace | IMPLEMENTED, UNVERIFIED | Pointer drag creates editable polyline paths in the canvas. |
| Raster/SVG reference import | IMPLEMENTED, UNVERIFIED | Browser object URL, reference visibility and opacity. |
| Select and delete path | PARTIAL | Select tool can select a path; delete removes it. Node editing is not implemented. |
| Undo/redo | PARTIAL, UNVERIFIED | Path-array snapshots only; no keyboard shortcuts yet. |
| Save/open project JSON | IMPLEMENTED, UNVERIFIED | Reference image is not embedded in the project. |
| SVG export | IMPLEMENTED, UNVERIFIED | Exports drawn paths and excludes the reference image. |
| Image-to-vector conversion | NOT IMPLEMENTED | No thresholding, contour extraction, or centerline algorithm yet. |
| Path planner / travel moves | NOT IMPLEMENTED | No operation ordering or physical-coordinate planning yet. |
| DXF / G-code | NOT IMPLEMENTED | No exporter or machine profile yet. |
| Simulator | NOT IMPLEMENTED | The current canvas is a drawing workspace, not a machine simulator. |
| Local Bridge / physical device | NOT IMPLEMENTED | No hardware commands are sent. |
| Automated tests / CI | PENDING | Add and run CI before treating the scaffold as verified. |

## Known MVP limitations

- Paths are polylines; curve/node editing and smoothing are not implemented.
- The document dimensions are initial defaults and are not yet user-editable.
- SVG reference display and import behavior need browser testing.
- Save/open currently stores project JSON, but does not embed the reference image.
- Exported SVG needs visual and geometry regression tests.
- No claim of machine readiness or physical safety is made.
