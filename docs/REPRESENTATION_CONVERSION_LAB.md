# Representation Conversion Lab — Architecture Proposal

Status: EXPERIMENTAL PRODUCT SPECIFICATION  
Target: LineCraft Studio (`naiankusan/Lolipancake-`)  
Scope: general-purpose conversion and inspection of visual/geometry representations, including depth and height fields.  
Authority: application-level proposal only; not a NeriCore or KataCore canonical contract.

## 1. Decision

Extend LineCraft Studio with an optional **Representation Conversion Lab** workspace. Do not replace the existing image-to-path workflow. The current drawing workflow remains the first supported product path; the conversion lab adds a separate, inspectable pipeline for raster, vector, mask, depth/height, and mesh representations.

This is a product-layer experiment. It must not duplicate NeriCore's universal evidence/provenance contracts or KataCore's geometry, forming, manufacturing, validation, and release authority.

## 2. Core principle

Do not implement every format pair as a bespoke converter. Use:

`Input Adapter → Normalized Representation Graph → Transformation → Validation → Output Adapter`

The graph is an application-level working model, not a new universal ontology. Each transformation records its input, parameters, software/model version where known, warnings, and output lineage.

**Deterministic geometry first; AI inference only where the source is ambiguous or information is missing.** A visually plausible output is not proof that the source was preserved.

## 3. Representation families

### 2D source
- Raster image: PNG, JPEG, WebP; preserve original bytes and dimensions.
- Vector: SVG first; DXF may follow after explicit unit and entity support.
- Binary mask / silhouette.
- Line art / contours / centerlines, which are distinct representations and must not be silently substituted for one another.

### Scalar fields
- Generic grayscale image.
- Depth map: camera-relative or model-specific depth convention, with polarity and normalization metadata.
- Height map: scalar height over a declared XY domain and reference plane.
- Relief height field: height field plus valid-region mask, base/reference level, and optional region semantics.
- Inverted height map: an explicit transform derivative, not a synonym for depth map.

A grayscale image is not automatically a calibrated depth or height field. If polarity, scale, camera convention, or reference plane is unknown, keep it unknown and ask the user or record an explicit assumption.

### 3D geometry
- Triangle mesh: OBJ/STL initially; GLB/GLTF may follow.
- Point clouds or CAD-native solids are later adapters, not MVP requirements.
- Mesh-to-height conversion must declare projection direction, XY bounds, resolution, occlusion policy, and how multiple surfaces are handled.

## 4. Normalized Representation Graph

Each node should minimally contain:
- `id`, `kind`, `schema_version`;
- source/reference ID and parent node IDs;
- coordinate frame, units, bounds, resolution and origin when applicable;
- validity mask / silhouette / contour as separate data where relevant;
- semantic metadata such as depth polarity, height reference plane, projection direction, and scalar range;
- epistemic labels for claims about source-derived geometry: `OBSERVED`, `INFERRED`, `UNKNOWN`;
- transformation history, parameters, warnings and known information loss;
- optional quality measurements and user edits.

Do not force every field onto every representation. Use typed, versioned payloads with explicit applicability. Avoid a generic bag of optional values that appears complete while being semantically ambiguous.

The original input is immutable. Edits and conversions create versioned derivatives; never overwrite the source asset.

## 5. Conversion routing

The router chooses a path based on source type, target type, available adapters, and required guarantees. It must explain the selected path and identify lossy or ambiguous steps.

Initial target workflows:
1. SVG → mask / contour / preview height field.
2. Line art → editable regions/contours → proposed relief height field (AI optional).
3. Photo → estimated depth map (AI optional, clearly marked as estimated).
4. Depth/height field → mesh, preserving valid-region mask and silhouette.
5. Mesh → height field under an explicitly selected projection policy.
6. Height field → inverted height field, with a recorded polarity transform.
7. Raster → vector paths through the existing LineCraft workflow.

Do not promise every input/output pair. Unsupported or semantically invalid conversions must be disabled with an explanation, not approximated silently.

## 6. Depth, height and relief are not interchangeable

- **Depth map** describes depth under a particular camera/model convention; near/far polarity and normalization vary.
- **Height map** describes elevation over an XY domain relative to a reference.
- **Relief height field** is a height map constrained by a valid object region and a base/reference convention.
- **Inverted height field** reverses a declared scalar mapping; it does not reconstruct missing geometry.

Depth-to-height conversion needs an explicit reconstruction policy (for example, a known projection/scene assumption). A grayscale inversion alone cannot recover a physical height field from arbitrary monocular depth.

## 7. Validation and anti-drift

Each transform reports applicable checks, not a single generic pass:
- dimensions, bounds, coordinate frame and units;
- silhouette/valid-region preservation;
- contour closure and topology when vector contours are required;
- scalar range, NaN/invalid-pixel handling and polarity;
- source-to-output lineage and parameter reproducibility;
- lossiness, unsupported features and resampling effects;
- mesh validity for supported mesh outputs;
- visual comparison and user-reviewed differences.

For image-derived geometry, keep observed source features separate from inferred hidden geometry. Confidence must not upgrade an inference into an observation. Unknown scale must not be fabricated.

A green validation result means only that the named checks passed. It does not mean a model is dimensionally calibrated, manufacturable, physically validated, or authorized for fabrication.

## 8. AI boundary

AI may propose regions, feature classes, depth, hidden-surface hypotheses or suggested parameters. AI results must:
- be optional and replaceable by deterministic/manual methods where feasible;
- be marked as estimates/inferences;
- retain model/provider/version and prompt/configuration when available;
- preserve the original source and allow manual correction;
- expose uncertainty or alternatives when the evidence supports multiple interpretations;
- never silently invent scale or claim manufacturing readiness.

Keep AI providers behind adapters. The MVP must still open and edit supported files without network access; AI-dependent operations may be unavailable offline.

## 9. MVP implementation order

### Phase A — deterministic foundation
- Add typed representation kinds and metadata.
- Implement SVG/raster import with source preservation.
- Implement masks/contours and explicit coordinate/unit handling.
- Implement height-field preview and explicit inversion.
- Implement height field → mesh with declared bounds, resolution and valid-region mask.
- Add conversion history, warnings and export metadata.

### Phase B — depth and mesh adapters
- Add image depth inference as an optional adapter.
- Add mesh → height field with explicit projection controls.
- Add reproducible test fixtures for polarity, masks, bounds, units and known lossy conversions.

### Phase C — structured relief proposals
- Add line-art region/feature analysis and layered relief proposals.
- Support editable region depths, ridges/grooves, base level and layer ordering.
- Compare direct AI output with structured/manual composition; do not assume either is superior without fixture-based evaluation.

## 10. Acceptance criteria

1. Source assets remain byte-preserved and are never overwritten by derived outputs.
2. Every output identifies its input lineage and transformation parameters.
3. Depth/height polarity, units, coordinate frame and reference plane are explicit or UNKNOWN.
4. A rectangular canvas cannot silently become the object's physical boundary when a valid-region mask/silhouette is declared.
5. SVG contours, centerlines and filled regions remain distinct.
6. A conversion that loses information reports the loss and does not claim reversibility.
7. Unsupported conversions fail with an actionable explanation.
8. The same deterministic transform and parameters produce equivalent outputs within a declared tolerance.
9. AI-derived values are labeled as estimates/inferences and are editable.
10. No preview/export state claims dimensional calibration, physical validation, manufacturing feasibility or fabrication authority.

## 11. System boundaries

- **LineCraft Studio:** UI, file import/export, editing, conversion orchestration, local preview and application-level history.
- **NeriCore:** universal evidence/provenance/uncertainty contracts, only through an explicit future adapter if needed.
- **KataCore:** downstream geometry/tooling/manufacturing/validation contracts, only through an explicit future adapter if needed.
- **Domain packages:** domain-specific interpretation; not embedded in this general conversion workspace.

Do not create duplicate canonical schemas in LineCraft. If integration becomes necessary, map to the upstream/downstream contract through a versioned adapter rather than copying their rules into this app.

## 12. Non-goals for this proposal

- A universal converter for every format.
- Guaranteed reconstruction of true physical depth from a single image.
- Automatic fabrication-ready CAD.
- Silent unit guessing, scale fabrication, or hidden-geometry completion presented as fact.
- Replacing the existing SVG/path planning workflow.
- Declaring novelty or superiority over existing depth/relief tools without comparative tests.

## 13. Evaluation plan

Use a small fixed fixture set covering SVG, line art, photo, binary mask, known synthetic height field, known synthetic depth field, and a simple mesh. Evaluate:
- source/silhouette fidelity;
- region and layer ordering;
- scalar polarity and scale semantics;
- editability;
- reproducibility;
- runtime and offline behavior;
- explicit detection/reporting of unsupported or lossy conversions.

Compare deterministic baseline, direct AI inference, and structured relief proposal on the same fixtures. Record failures as well as successes.
