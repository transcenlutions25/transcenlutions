# Local checklist product builder

Status: **source-tested local capability**, not installed on the owner's Mac, not connected to chat execution, not a customer offer. No deployment, sale, payment, provider call or revenue is implied.

This additive slice lives in the existing desktop runtime package rather than creating another queue, agent or Apex builder. `product_builder.py` imports safely without optional dependencies. `build_product(brief, output_root)` is a fixed trusted handler for a validated JSON brief; the executor must supply an authorized isolated workspace. It never lets content choose commands, templates, output paths, network destinations or Python expressions.

## What is saved and editable

Each build saves a PDF, the normalized `brief.json` source, an editable Markdown companion, plain text and a JSON manifest. Use the same `product_id` to preserve identity. A content + builder-source + dependency hash identifies each version. Identical builds reuse verified bytes; edits create a new directory. Modified or unexpected existing version files cause a failure instead of overwrite.

Copy saved `brief.json` to a **working file outside the immutable version directory**, edit the copy and rebuild. This retains both original source and original PDF. The initial input brief is already such a working file. Markdown can also be edited, but those edits are independent: PDF regeneration uses JSON only. No claim of synchronized rich-text editing is made.

The manifest includes fixed workspace-relative file paths, MIME types, byte counts, SHA-256 hashes, source/dependency provenance, supported actions and compatibility limits. Local-only ownership is explicit; there is no production account entitlement, hosted artifact library registration or cross-account access claim. Authorizing another agent to use the file does not authorize sharing with a remote model.

## Dependencies and commands

Python 3.9+ is supported. PDF creation requires the optional open-source ReportLab package, including its bundled Vera fonts. Existing queue behavior stays standard-library-only. The builder never installs a package or silently substitutes a paid service. On an environment without ReportLab it fails with a clear message. The cloud proof used preinstalled ReportLab 4.4.9; the Mac dependency state is unverified.

From the repository root, prepare a separate local workspace and copy the sample working brief:

```sh
mkdir -p /tmp/tay-product-demo
cp integrations/tay-desktop/examples/sample-product-brief.json /tmp/tay-product-demo/working-brief.json
python3 integrations/tay-desktop/tay_runtime/product_builder.py \
  --workspace /tmp/tay-product-demo --brief working-brief.json
```

The command prints the artifact manifest. Open the PDF at `workspace / entrypoint` with your normal local PDF viewer. To regenerate, edit `working-brief.json` and run the same command; the old version remains saved.

Python API:

```python
from tay_runtime.product_builder import build_product
manifest = build_product(brief, trusted_isolated_workspace)
```

`output_root` is an existing isolated workspace chosen and authorized by the executor, **never a path from a model or request body**. The module rejects symlink components and creates only fixed internal names. Like the surrounding local owner runtime, it is not a hostile-process sandbox or multi-user filesystem boundary; use private workspaces not writable by untrusted users.

## Brief contract

Exact fields only:

- `schema_version`: integer 1
- `product_id`: 3-48 characters, lowercase letters/numbers/hyphens; starts with a letter
- `title`: 1-90 characters; `subtitle`: 1-160
- `audience`: 1-200; `purpose`: 1-500
- `sections`: 1-6 objects, each with `heading` (1-90), `summary` (1-400), and 1-8 `items`
- Each item has `label` (1-160) and `detail` (1-500)

V1 supports printable ASCII, normalized whitespace, 32 KB total source and at most 12 PDF pages. It rejects unsupported fields, HTML/script markup, control characters, traversal identifiers, symlinks, hidden input paths, duplicate JSON keys and oversized inputs. A script-like sentence may remain inert text; the stronger boundary is that no content is executed, fetched, interpolated into a shell or granted authority. ReportLab paragraph markup receives escaped plain text only.

The sample is intentionally a generic workspace-reset checklist, not another Apex or cleaning product. All generated outputs are marked draft/sample. Factual and commercial review remain necessary before intended use.

## Repeatable offline QA

The optional QA module requires local `pypdf`, `pdfplumber` and Poppler `pdftoppm`. Nothing is downloaded or installed. It checks every artifact hash, extracts and matches every source field, checks text bounds/page count, rejects PDF actions/annotations and renders every page. Poppler is invoked with fixed arguments, no shell, a 30-second timeout and bounded page count/resolution.

Use the returned identity and version:

```sh
PYTHONPATH=integrations/tay-desktop python3 -m tay_runtime.product_qa \
  --workspace /tmp/tay-product-demo \
  --product-id one-hour-workspace-reset --version VERSION_FROM_MANIFEST
```

The QA report and page PNGs are saved in a separate private `product-qa-*` folder, leaving version files unchanged. Open **every** rendered page and inspect clipping, spacing and readability. Automated extraction is not visual approval; `visual_review` stays `not_run` until a separate reviewer records evidence. The proof was visually inspected on all two pages after embedding fonts to remove substitution defects.

Accessibility: fonts are embedded, text is selectable and extracted in source order, and editable Markdown/plain-text companions are provided. The PDF is static, not a fillable form and not tagged PDF/UA. Screen-reader conformance, tagged reading order and local Mac viewer behavior are not established.

## Tests and rollout

```sh
python3 -m unittest discover -s integrations/tay-desktop/tests -v
```

Builder tests cover schema/bounds, dangerous markup, unsupported action/path fields, symlink inputs/outputs, files/FIFOs, duplicate/deep JSON, missing dependency, real PDF content, hashes/idempotence, immutable versions and edit/regenerate. Optional rendering tests skip explicitly if QA packages are missing. The standard-library validation tests still run.

No bridge, UI, installer hook or queue authorization has been changed by this slice. A separate bounded executor can call this handler only after validating the intended task and isolating the workspace. Live installation, UI integration and output opening on the owner's Mac require that environment to be connected and a reviewed installation plan. No arbitrary code execution should be added to make this product handler more convenient.
