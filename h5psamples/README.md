# H5P Course Presentation Toolkit

Utilities for inspecting and transforming H5P Course Presentation packages:

- **Preview web app:** Upload an exported package, browse slides, and build a semantic outline.
- **Exporter CLI:** Convert `.h5p`/`.zip`/folders into a JSON manifest plus `media/` assets for downstream pipelines.

## Repository Layout

| Path | Purpose |
| ---- | ------- |
| `app.py` | Flask server for uploads, slide rendering, and semantic JSON export. |
| `templates/`, `static/` | Jinja templates, CSS, and JS powering the UI. |
| `export_bundle.py` | Command-line bundler that emits `package.json` and copies assets to `media/`. |
| `corpus/`, `videos/` | Sample extracted H5P packages for testing. |
| `setup.sh`, `Makefile` | Convenience scripts for installing deps, running the server, tests, and exporter. |
| `tests/` | Unit tests for semantic grouping and the `/semantic-json` API. |

## Prerequisites

- Python 3.11+ with `venv` module available.
- `unzip`/`zip` for preparing exports.
- Optional: `make` for the shorthand commands.

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd h5psamples

# 2. Create virtualenv + install dependencies
./setup.sh            # or: make install

# 3. Run preview UI
FLASK_APP=app.py .venv/bin/flask run    # or: make run
```

Open `http://127.0.0.1:5000` to start interacting with the preview.

## Preview Web App Workflow

1. **Prepare a package:** Export your H5P Course Presentation as `.h5p`, unzip it, or zip an extracted folder (e.g., `corpus/`). The uploaded archive must contain `h5p.json` at its root.
2. **Upload:** Use the landing form to submit the `.zip`. Slides render immediately with inline text, images, videos (YouTube embeds supported), and navigation cues. Click **Details** to inspect raw element JSON.
3. **Annotate structure:** Each slide includes Section / Subsection / Content type inputs. Populate them to describe your learning path or documentation outline.
4. **Download semantic JSON:** Hit **Download semantic JSON** to receive `semantic.json`, which contains:
   - Metadata (`title`, `language`, `packageId`).
   - `sections[]` with optional `subsections[]`, each listing the slides you assigned.
   - Per-slide summaries (content type + element previews, file references, links).

The preview uses `data:` URIs, so no additional hosting is required for assets during browsing.

## JSON + Media Exporter

Use the CLI when you need a portable archive with media files on disk.

```bash
# Direct invocation (.h5p, .zip, or folder input)
.venv/bin/python export_bundle.py corpus.h5p -o corpus-bundle.zip

# Makefile shortcut (uses corpus.h5p -> corpus-bundle.zip)
make export
```

Zip contents:

- `package.json` – combines `h5p.json`, `content/content.json`, library manifests, and an `assets[]` manifest (path, MIME, size, sha256).
- `media/…` – every file residing under `content/` except `content.json`, preserving original relative paths.

Useful flags:

- `--package-id custom-id` – override the identifier stored in `package.json`.
- `--indent 0` – disable pretty printing to shrink the output file.
- Supply a directory path instead of a zip if your H5P is already extracted.

## Testing & Tooling

```bash
# Unit tests (semantic builder + endpoint)
make test

# Static sanity check
.venv/bin/python -m py_compile app.py export_bundle.py

# Clean virtualenv + generated bundles
make clean
```

Manual smoke tests:

1. Start the Flask app via `make run` and upload `corpus/` zipped locally.
2. Verify slides render, annotate a few, and download `semantic.json`.
3. Run `make export` and inspect `corpus-bundle.zip` for both `package.json` and `media/` assets.

## Troubleshooting

- **Upload errors:** Ensure the root of your zip includes `h5p.json`. If the file sits inside a nested folder, re-zip the contents instead of the parent directory.
- **Missing media:** Assets outside `content/` are ignored; copy required files into `content/images`, `content/videos`, etc., before exporting.
- **Virtualenv problems:** Delete `.venv/` and rerun `./setup.sh` for a clean environment.

Feel free to extend the renderers in `app.py` for additional H5P libraries or integrate the exporter output with your own LMS/LXP pipelines.
