# Repository Guidelines

## Project Structure & Module Organization
- `app.py`: Flask preview UI handling uploads, parsing `content/content.json`, and rendering slides with assets embedded as data URIs.
- `export_bundle.py`: CLI tool that converts `.h5p/.zip` exports into `package.json` plus `media/` folders inside a single archive.
- `templates/` and `static/`: Jinja templates and UI assets (`styles.css`, `main.js`) powering the preview front end.
- `corpus/` and `videos/`: Sample extracted H5P packages useful for testing both tools.
- `README.md`, `AGENTS.md`, `requirements.txt`: Contributor docs and Python dependencies.

## Build, Test, and Development Commands
- `python3 -m venv .venv && source .venv/bin/activate`: Create and activate a virtualenv for all Python work.
- `pip install -r requirements.txt`: Install Flask and other runtime dependencies.
- `FLASK_APP=app.py flask run`: Launch the preview UI at `http://127.0.0.1:5000`.
- `python export_bundle.py corpus.h5p -o corpus-bundle.zip`: Build a JSON+media archive from any H5P export (replace the source path as needed).
- `python3 -m py_compile app.py export_bundle.py`: Lightweight sanity check to ensure both entry points parse.

## Coding Style & Naming Conventions
- Stick to Python 3.11+ type annotations, 4-space indentation, and descriptive variable names (`package_root`, `slides_nav`).
- Prefer `Path` objects over plain strings for filesystem work and keep helper functions pure where possible.
- Follow existing module layout: helper functions grouped near their call sites, Jinja templates kept minimal, and UI classes styled via `static/styles.css`.

## Testing Guidelines
- There is no full test harness; run CLI commands against the `corpus/` sample and use `py_compile` to catch syntax errors.
- When adding modules, include self-contained smoke commands (e.g., `python new_tool.py --help`) in PR descriptions.
- For UI changes, attach screenshots or describe steps to reproduce the view when previewing locally.

## Commit & Pull Request Guidelines
- Commits should be scoped to a single concern with imperative messages like `Add H5P exporter CLI` or `Polish viewer modal`.
- Reference related issues in the PR body, summarize the motivation, list verification steps, and include any screenshots/logs.
- New dependencies or configuration changes must be called out explicitly and documented in `README.md`.

## Security & Configuration Tips
- Never trust uploaded archives: keep path resolution confined to the extracted temp directory and always validate extensions before processing.
- Avoid storing secrets in the repo; use environment variables (`FLASK_SECRET_KEY`) for local overrides.
