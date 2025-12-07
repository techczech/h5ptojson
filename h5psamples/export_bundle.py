import argparse
import hashlib
import json
import mimetypes
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create a unified JSON + media archive from an H5P Course Presentation "
            "export or folder."
        )
    )
    parser.add_argument("source", help="Path to .h5p/.zip file or extracted folder")
    parser.add_argument(
        "-o",
        "--output",
        help="Destination .zip path (defaults to <source-stem>-bundle.zip)",
    )
    parser.add_argument(
        "--package-id",
        help="Override packageId stored inside the JSON bundle",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Indentation to use when writing JSON (default: 2)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_path = Path(args.source).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Source path does not exist: {source_path}")

    default_output = source_path.stem + "-bundle.zip"
    output_path = Path(args.output).expanduser().resolve() if args.output else Path(default_output)

    if source_path.is_dir():
        package_root = locate_package_root(source_path)
        bundle, files = build_bundle(package_root, args.package_id)
        write_zip(output_path, bundle, files, indent=args.indent)
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(source_path) as archive:
            archive.extractall(tmpdir)
        package_root = locate_package_root(Path(tmpdir))
        bundle, files = build_bundle(package_root, args.package_id or source_path.stem)
        write_zip(output_path, bundle, files, indent=args.indent)


def locate_package_root(base_path: Path) -> Path:
    base_path = base_path.resolve()
    if (base_path / "h5p.json").exists():
        return base_path
    for child in base_path.iterdir():
        if child.is_dir() and (child / "h5p.json").exists():
            return child
    raise FileNotFoundError("Could not find h5p.json in extracted archive.")


def build_bundle(package_root: Path, package_id: str | None) -> Tuple[Dict, List[Tuple[Path, str]]]:
    metadata = load_json(package_root / "h5p.json")
    content_root = package_root / "content"
    content = load_json(content_root / "content.json")

    media_files = list(iter_media_files(content_root))
    assets = []
    file_manifest: List[Tuple[Path, str]] = []
    for file_path in media_files:
        rel = file_path.relative_to(content_root)
        archive_dest = Path("media") / rel
        assets.append(
            {
                "path": archive_dest.as_posix(),
                "mimetype": mimetypes.guess_type(file_path.name)[0],
                "size": file_path.stat().st_size,
                "sha256": sha256_of_file(file_path),
            }
        )
        file_manifest.append((file_path, archive_dest.as_posix()))

    libraries = collect_libraries(package_root)

    bundle = {
        "packageId": package_id or package_root.name,
        "metadata": metadata,
        "content": content,
        "libraries": libraries,
        "assets": assets,
    }
    return bundle, file_manifest


def iter_media_files(content_root: Path) -> Iterable[Path]:
    if not content_root.exists():
        return []
    for path in content_root.rglob("*"):
        if path.is_file() and path.name != "content.json":
            yield path


def collect_libraries(package_root: Path) -> Dict[str, Dict]:
    libraries = {}
    for folder in package_root.iterdir():
        if folder.is_dir() and should_include_library(folder.name):
            manifest = folder / "library.json"
            if manifest.exists():
                libraries[folder.name] = load_json(manifest)
    return libraries


def should_include_library(name: str) -> bool:
    prefixes = ("H5P.", "H5PEditor.", "FontAwesome", "Shepherd", "jQuery")
    return name.startswith(prefixes)


def load_json(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256_of_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def write_zip(output_path: Path, bundle: Dict, files: List[Tuple[Path, str]], indent: int = 2) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("package.json", json.dumps(bundle, ensure_ascii=False, indent=indent))
        for src, dest in files:
            archive.write(src, dest)
    print(f"Created bundle at {output_path}")


if __name__ == "__main__":
    main()
