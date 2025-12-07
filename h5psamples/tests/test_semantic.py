import json
import unittest

from werkzeug.test import Client as WsgiClient

from app import build_semantic_json, create_app


def make_slide(index, title, libraries):
    elements = []
    for position, library in enumerate(libraries, start=1):
        params = {}
        if library.startswith("H5P.AdvancedText"):
            params["text"] = "<p>Sample content</p>"
        if library.startswith("H5P.Image"):
            params["file"] = {"path": "images/example.png"}
        if library.startswith("H5P.Video"):
            params["sources"] = [{"path": "videos/example.mp4", "mime": "video/mp4"}]

        elements.append(
            {
                "id": f"slide{index + 1}-element{position}",
                "title": f"{library} block",
                "library": library,
                "raw": {
                    "action": {
                        "library": library,
                        "params": params,
                    }
                },
            }
        )

    return {"index": index, "title": title, "elements": elements}


class SemanticBuilderTests(unittest.TestCase):
    def setUp(self):
        self.seed = {
            "packageId": "demo",
            "metadata": {"title": "Demo", "language": "en"},
            "slides": [
                make_slide(0, "Intro", ["H5P.AdvancedText 1.1"]),
                make_slide(1, "Video", ["H5P.Video 1.6"]),
                {"index": 2, "title": "Empty", "elements": []},
                make_slide(3, "Mixed", ["H5P.AdvancedText 1.1", "H5P.Image 1.1"]),
            ],
        }

    def test_sections_and_subsections_grouping(self):
        assignments = [
            {"index": 0, "section": "Overview", "contentType": "Text"},
            {"index": 1, "section": "Overview", "subsection": "Media"},
            {"index": 2, "section": "Tasks", "contentType": "Activity"},
        ]

        result = build_semantic_json(self.seed, assignments)
        sections = result["sections"]

        self.assertEqual(len(sections), 3)
        overview = next(sec for sec in sections if sec["name"] == "Overview")
        self.assertEqual(len(overview["slides"]), 1)
        self.assertEqual(overview["slides"][0]["index"], 0)

        self.assertEqual(len(overview["subsections"]), 1)
        media = overview["subsections"][0]
        self.assertEqual(media["slides"][0]["index"], 1)

        ungrouped = next(sec for sec in sections if sec["name"] == "Ungrouped")
        self.assertEqual(ungrouped["slides"][0]["index"], 3)

    def test_content_type_inference(self):
        assignments = [{"index": 0, "section": "Overview", "contentType": "Hero"}]

        result = build_semantic_json(self.seed, assignments)
        mapping = self._flatten_slide_mapping(result)

        self.assertEqual(mapping[1]["contentType"], "H5P.Video 1.6")
        self.assertEqual(mapping[2]["contentType"], "Empty")
        self.assertEqual(mapping[3]["contentType"], "Mixed")

    def test_semantic_endpoint_returns_file(self):
        app = create_app()
        client = WsgiClient(app, app.response_class)

        response = client.post(
            "/semantic-json",
            json={
                "package": self.seed,
                "slides": [{"index": 0, "section": "Intro", "contentType": "Text"}],
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "application/json")
        self.assertIn("attachment; filename=semantic.json", response.headers["Content-Disposition"])

        payload = json.loads(response.get_data(as_text=True))
        self.assertIn("sections", payload)
        self.assertGreaterEqual(len(payload["sections"]), 1)

    def _flatten_slide_mapping(self, result):
        mapping = {}
        for section in result["sections"]:
            for slide in section.get("slides", []):
                mapping[slide["index"]] = slide
            for subsection in section.get("subsections", []):
                for slide in subsection.get("slides", []):
                    mapping[slide["index"]] = slide
        return mapping


if __name__ == "__main__":
    unittest.main()
