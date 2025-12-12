# H5P to Semantic JSON Converter

A client-side React application that extracts H5P packages, converts them to a clean semantic JSON format, and provides full viewing and editing capabilities.

## Features

- **H5P Package Parsing**: Upload `.h5p` or `.zip` files and extract all content client-side
- **Semantic JSON Conversion**: Transform H5P content into a clean, normalized JSON structure
- **Interactive Viewer**: Navigate slides, view media, and interact with quizzes
- **Full Editor**: Modify content, reorder slides, edit quiz questions
- **Export**: Download semantic JSON for further processing

## Supported Content Types

### Container Types
- CoursePresentation (slides with elements)
- InteractiveVideo (video with timed interactions)

### Media Types
- AdvancedText / Text
- Image (with zoom)
- Video (YouTube and local)
- Audio
- Link
- Table
- Shape

### Quiz Types
- MultiChoice (single and multiple answer)
- SingleChoiceSet
- Summary
- TrueFalse
- Blanks (fill in the blanks)
- DragText
- MarkTheWords
- DragQuestion

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

1. **Upload**: Drop an H5P file on the upload area or click to browse
2. **View**: Navigate through slides using the sidebar or prev/next buttons
3. **Interact**: Complete quizzes, watch videos, zoom images
4. **Edit**: Switch to editor mode to modify content
5. **Export**: Download the semantic JSON representation

## Project Structure

```
src/
├── lib/
│   ├── h5p/
│   │   ├── parser.ts           # ZIP extraction
│   │   ├── types.ts            # H5P TypeScript interfaces
│   │   └── content-types/      # Per-type parsers
│   ├── semantic/
│   │   ├── schema.ts           # Output JSON types
│   │   └── transformer.ts      # H5P → Semantic conversion
│   └── storage.ts              # IndexedDB persistence
├── components/
│   ├── upload/                 # File upload UI
│   ├── viewer/                 # Display components
│   ├── editor/                 # Editing UI
│   └── interactive/            # Quiz components
├── hooks/
│   ├── useH5PParser.ts
│   └── useSemanticStore.ts
└── pages/
    ├── Home.tsx                # Upload page
    ├── Viewer.tsx              # View mode
    └── Editor.tsx              # Edit mode
```

## Semantic JSON Schema

The output format is a clean, hierarchical representation:

```json
{
  "id": "package-id",
  "title": "Package Title",
  "language": "en",
  "contentType": "H5P.CoursePresentation",
  "metadata": { ... },
  "structure": {
    "sections": [
      {
        "id": "section-main",
        "title": "Main",
        "slides": [
          {
            "id": "slide-0",
            "title": "Slide Title",
            "elements": [ ... ]
          }
        ]
      }
    ]
  },
  "interactives": [ ... ],
  "media": {
    "images": [ ... ],
    "videos": [ ... ],
    "audio": [ ... ]
  }
}
```

## Sample Data

The `h5psamples/` directory contains sample H5P packages for testing:
- `corpus.h5p` - CoursePresentation with various content types
- `videos.h5p` - InteractiveVideo example

## License

ISC




