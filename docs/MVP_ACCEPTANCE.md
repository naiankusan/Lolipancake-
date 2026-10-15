# MVP Acceptance Criteria

The first usable milestone is a browser-only manual-trace editor. It does not control physical machines.

## Import and reference layer
- [ ] Import PNG, JPEG, WebP, and SVG reference files.
- [ ] Keep the reference separate from editable paths.
- [ ] Show/hide the reference and adjust opacity.
- [ ] Invalid or oversized files produce a clear error.

## Canvas and tracing
- [ ] Zoom and pan without losing document coordinates.
- [ ] Create paths with pointer input and finish a path explicitly.
- [ ] Select and delete paths.
- [ ] Undo and redo restore document state.
- [ ] Editable paths are stored as vector geometry, not only pixels.

## Document model
- [ ] Document has explicit units and dimensions.
- [ ] Each path has a stable ID and semantic type.
- [ ] Source reference and derived paths remain separate.
- [ ] Save/open round-trips all supported fields.
- [ ] Unknown values are not guessed.

## SVG export
- [ ] Exported SVG opens in a standard viewer.
- [ ] Export preserves path geometry and dimensions.
- [ ] Raster reference is excluded unless explicitly requested.
- [ ] Empty or invalid documents show a useful message.

## Quality
- [ ] TypeScript type-check and production build pass.
- [ ] Core model and geometry have automated tests.
- [ ] UI clearly labels the app as preview-only; it must not imply hardware is connected.

## Later milestones
Image conversion, path planning, simulator, DXF, G-code, and Local Bridge each need separate tests and acceptance criteria before being described as implemented.
