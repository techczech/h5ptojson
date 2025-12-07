import base64
import io
import json
import os
import re
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from flask import Flask, Response, flash, redirect, render_template, request, url_for
from markupsafe import Markup, escape


class PackageError(Exception):
    """Raised when the uploaded archive cannot be parsed."""


@dataclass
class ElementView:
    id: str
    title: str
    library: str
    display_html: Markup
    raw: Dict[str, Any]


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")

    @app.route("/", methods=["GET", "POST"])
    def index():
        if request.method == "POST":
            upload = request.files.get("package")
            if upload is None or upload.filename == "":
                flash("Select a .zip export before submitting.", "error")
                return redirect(url_for("index"))
            try:
                package = parse_package(upload)
            except PackageError as exc:
                flash(str(exc), "error")
                return redirect(url_for("index"))
            return render_template("viewer.html", package=package)

        return render_template("index.html")

    @app.post("/semantic-json")
    def semantic_json():
        payload = request.get_json(silent=True)
        if not payload:
            return {"error": "Invalid JSON payload"}, 400

        package_seed = payload.get("package")
        assignments = payload.get("slides", [])
        if not package_seed:
            return {"error": "Missing package seed"}, 400

        try:
            semantic = build_semantic_json(package_seed, assignments)
        except ValueError as exc:
            return {"error": str(exc)}, 400

        response = Response(
            json.dumps(semantic, ensure_ascii=False, indent=2),
            mimetype="application/json",
        )
        response.headers["Content-Disposition"] = "attachment; filename=semantic.json"
        return response

    return app


def parse_package(file_storage) -> Dict[str, Any]:
    file_bytes = file_storage.read()
    if not file_bytes:
        raise PackageError("Uploaded file is empty.")

    if not zipfile.is_zipfile(io.BytesIO(file_bytes)):
        raise PackageError("File must be a .zip archive extracted from an H5P package.")

    with tempfile.TemporaryDirectory() as tmpdir:
        buffer = io.BytesIO(file_bytes)
        with zipfile.ZipFile(buffer) as archive:
            archive.extractall(tmpdir)

        root = Path(tmpdir)
        metadata = _load_json(root / "h5p.json", "h5p.json not found inside archive.")
        content_root = (root / "content").resolve()
        course = _load_json(content_root / "content.json", "content/content.json missing.")

        slides = course.get("presentation", {}).get("slides", [])
        processed_slides = _build_slide_views(content_root, slides)
        semantic_seed = _build_semantic_seed(metadata, processed_slides)

        return {
            "title": metadata.get("title", "H5P Package"),
            "metadata": metadata,
            "slides": processed_slides,
            "semantic_seed": semantic_seed,
        }


def _load_json(path: Path, error_message: str) -> Dict[str, Any]:
    if not path.exists():
        raise PackageError(error_message)
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _build_slide_views(content_root: Path, slides: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    processed = []
    for index, slide in enumerate(slides):
        title = _title_from_keywords(slide.get("keywords")) or f"Slide {index + 1}"
        elements = []
        for element_index, element in enumerate(slide.get("elements", [])):
            element_view = _element_to_view(
                content_root, element, slide_index=index, element_index=element_index
            )
            if element_view is not None:
                elements.append(element_view)
        processed.append({
            "title": title,
            "index": index,
            "elements": elements,
            "raw": slide,
        })
    return processed


def _build_semantic_seed(metadata: Dict[str, Any], slides: List[Dict[str, Any]]) -> Dict[str, Any]:
    sanitized_slides = []
    for slide in slides:
        sanitized_elements = []
        for element in slide.get("elements", []):
            sanitized_elements.append(
                {
                    "library": element.get("library"),
                    "title": element.get("title"),
                    "raw": element.get("raw"),
                }
            )
        sanitized_slides.append(
            {
                "index": slide["index"],
                "title": slide["title"],
                "raw": slide.get("raw"),
                "elements": sanitized_elements,
            }
        )

    return {
        "packageId": metadata.get("title") or "h5p-package",
        "metadata": metadata,
        "slides": sanitized_slides,
    }


def build_semantic_json(seed: Dict[str, Any], assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
    slides = seed.get("slides") or []
    metadata = seed.get("metadata") or {}
    if not slides:
        raise ValueError("No slides available to describe.")

    assignment_map = {entry.get("index"): entry for entry in assignments if "index" in entry}
    sections: List[Dict[str, Any]] = []
    section_lookup: Dict[str, Dict[str, Any]] = {}

    for slide in slides:
        slide_index = slide.get("index")
        assignment = assignment_map.get(slide_index, {})
        section_name = (assignment.get("section") or "Ungrouped").strip() or "Ungrouped"
        subsection_name = (assignment.get("subsection") or "").strip()
        content_type = (assignment.get("contentType") or "").strip()
        if not content_type:
            content_type = _infer_content_type(slide)

        section = section_lookup.get(section_name)
        if not section:
            section = {"name": section_name, "slides": [], "subsections": [], "_lookup": {}}
            section_lookup[section_name] = section
            sections.append(section)

        slide_entry = {
            "index": slide_index,
            "title": slide.get("title"),
            "contentType": content_type,
            "elements": [_summarize_element(element) for element in slide.get("elements", [])],
        }

        if subsection_name:
            subsection_lookup = section.setdefault("_lookup", {})
            subsection = subsection_lookup.get(subsection_name)
            if not subsection:
                subsection = {"name": subsection_name, "slides": []}
                subsection_lookup[subsection_name] = subsection
                section["subsections"].append(subsection)
            subsection["slides"].append(slide_entry)
        else:
            section["slides"].append(slide_entry)

    for section in sections:
        section.pop("_lookup", None)

    return {
        "packageId": seed.get("packageId") or metadata.get("title") or "h5p-package",
        "title": metadata.get("title") or "Untitled",
        "language": metadata.get("language") or metadata.get("defaultLanguage"),
        "sections": sections,
        "sourceMetadata": metadata,
    }


def _infer_content_type(slide: Dict[str, Any]) -> str:
    libraries = {element.get("library") for element in slide.get("elements", []) if element.get("library")}
    if not libraries:
        return "Empty"
    if len(libraries) == 1:
        return next(iter(libraries))
    return "Mixed"


def _summarize_element(element: Dict[str, Any]) -> Dict[str, Any]:
    raw = element.get("raw") or {}
    action = raw.get("action", raw)
    params = action.get("params", {}) if isinstance(action, dict) else {}
    summary: Dict[str, Any] = {
        "title": element.get("title"),
        "library": element.get("library"),
    }

    text_value = params.get("text")
    if isinstance(text_value, str) and text_value:
        summary["textPreview"] = _text_preview(text_value)

    file_info = params.get("file")
    if isinstance(file_info, dict) and file_info.get("path"):
        summary["file"] = file_info["path"]

    sources = params.get("sources")
    if isinstance(sources, list) and sources:
        summary["sources"] = sources

    link_widget = params.get("linkWidget")
    if isinstance(link_widget, dict) and link_widget.get("url"):
        summary["link"] = f"{link_widget.get('protocol', 'https://')}{link_widget['url']}"

    summary["raw"] = raw
    return summary


def _text_preview(html: str, limit: int = 160) -> str:
    plain = re.sub(r"<[^>]+>", "", html)
    plain = plain.strip()
    if len(plain) <= limit:
        return plain
    return plain[: limit - 1].rstrip() + "…"


def _title_from_keywords(keywords: Optional[List[Dict[str, Any]]]) -> str:
    if not keywords:
        return ""
    names = [kw.get("main") for kw in keywords if kw.get("main")]
    return " | ".join(names)


def _element_to_view(content_root: Path, element: Dict[str, Any], slide_index: int, element_index: int) -> Optional[Dict[str, Any]]:
    action = element.get("action")
    element_id = f"slide{slide_index + 1}-element{element_index + 1}"

    if not action:
        title = element.get("title", "Navigation")
        description = escape(
            f"Go to {element.get('goToSlideType', 'slide')} ({element.get('goToSlide', 'next')})"
        )
        return ElementView(
            id=element_id,
            title=title,
            library="Navigation",
            display_html=Markup(f"<p>{description}</p>"),
            raw=element,
        ).__dict__

    library = action.get("library", "Unknown")
    handler = None
    if library.startswith("H5P.AdvancedText"):
        handler = _render_advanced_text
    elif library.startswith("H5P.Image"):
        handler = _render_image
    elif library.startswith("H5P.Video"):
        handler = _render_video
    elif library.startswith("H5P.Link"):
        handler = _render_link

    if handler:
        display = handler(content_root, action)
    else:
        pretty = escape(json.dumps(action, ensure_ascii=False, indent=2))
        display = Markup(f"<pre>{pretty}</pre>")

    title = action.get("metadata", {}).get("title") or action.get("library")
    return ElementView(
        id=element_id,
        title=title or "Untitled",
        library=library,
        display_html=display,
        raw=element,
    ).__dict__


def _render_advanced_text(content_root: Path, action: Dict[str, Any]) -> Markup:
    text = action.get("params", {}).get("text", "")
    return Markup(text)


def _render_image(content_root: Path, action: Dict[str, Any]) -> Markup:
    file_info = action.get("params", {}).get("file", {})
    relative_path = file_info.get("path")
    if not relative_path:
        return Markup("<em>Image missing</em>")
    image_path = _safe_content_path(content_root, relative_path)
    if image_path is None or not image_path.exists():
        return Markup(f"<em>Image not found: {escape(relative_path)}</em>")
    data_uri = _data_uri_for_file(image_path)
    alt_text = escape(file_info.get("alt", ""))
    return Markup(f"<img src=\"{data_uri}\" alt=\"{alt_text}\" />")


def _render_video(content_root: Path, action: Dict[str, Any]) -> Markup:
    sources = action.get("params", {}).get("sources", [])
    if not sources:
        return Markup("<em>No video sources provided</em>")

    source = sources[0]
    mime = source.get("mime", "")
    path = source.get("path", "")

    if mime == "video/YouTube":
        embed_url = _youtube_embed_url(path)
        if not embed_url:
            return Markup(f"<em>Unsupported YouTube URL: {escape(path)}</em>")
        return Markup(
            f'<div class="video-wrapper"><iframe src="{embed_url}" ' \
            f'allowfullscreen loading="lazy" title="Embedded video"></iframe></div>'
        )

    video_path = _safe_content_path(content_root, path)
    if video_path is None or not video_path.exists():
        return Markup(f"<em>Video not found: {escape(path)}</em>")
    data_uri = _data_uri_for_file(video_path, mime or "video/mp4")
    return Markup(
        f'<video controls preload="metadata">'
        f'<source src="{data_uri}" type="{escape(mime or "video/mp4")}">' \
        "Your browser does not support embedded video." \
        "</video>"
    )


def _render_link(content_root: Path, action: Dict[str, Any]) -> Markup:
    widget = action.get("params", {}).get("linkWidget", {})
    url = widget.get("url")
    protocol = widget.get("protocol", "https://")
    if not url:
        return Markup("<em>Link missing</em>")
    href = protocol + url if not url.startswith("http") else url
    title = escape(action.get("metadata", {}).get("title") or href)
    href = escape(href)
    return Markup(f'<a href="{href}" target="_blank" rel="noopener">{title}</a>')


def _youtube_embed_url(original: str) -> Optional[str]:
    if not original:
        return None
    match = re.search(r"(?:youtu\.be/|v=)([A-Za-z0-9_-]{6,})", original)
    if not match:
        return None
    video_id = match.group(1)
    return f"https://www.youtube.com/embed/{video_id}"


def _data_uri_for_file(path: Path, mime: Optional[str] = None) -> str:
    data = path.read_bytes()
    encoded = base64.b64encode(data).decode("ascii")
    mimetype = mime or _guess_mime(path)
    return f"data:{mimetype};base64,{encoded}"


def _guess_mime(path: Path) -> str:
    if path.suffix.lower() in {".png"}:
        return "image/png"
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if path.suffix.lower() in {".gif"}:
        return "image/gif"
    return "application/octet-stream"


def _safe_content_path(content_root: Path, relative_path: str) -> Optional[Path]:
    content_root = content_root.resolve()
    candidate = (content_root / relative_path).resolve()
    if content_root not in candidate.parents and candidate != content_root:
        return None
    return candidate


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
