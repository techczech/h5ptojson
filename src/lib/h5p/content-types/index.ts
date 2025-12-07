import type { H5PAction, H5PPackage } from '../types'
import type { SemanticElementType, SemanticContent } from '../../semantic/schema'
import { parseAdvancedText, parseTable } from './media'
import { parseImage, parseVideo, parseAudio, parseLink } from './media'
import { parseShape } from './media'
import { parseMultiChoice, parseSingleChoiceSet } from './multichoice'
import { parseSummary } from './summary'
import { parseTrueFalse } from './true-false'
import { parseBlanks } from './blanks'
import { parseDragQuestion } from './drag-question'
import { parseDragText } from './drag-text'
import { parseMarkTheWords } from './mark-the-words'

export interface ContentTypeParser {
  (action: H5PAction, pkg: H5PPackage): SemanticContent
}

// Registry of content type parsers
const parsers: Record<string, ContentTypeParser> = {}

export function registerParser(libraryPrefix: string, parser: ContentTypeParser): void {
  parsers[libraryPrefix] = parser
}

export function getParser(library: string): ContentTypeParser | undefined {
  // Try exact match first
  if (parsers[library]) return parsers[library]
  
  // Try prefix match (e.g., "H5P.AdvancedText" matches "H5P.AdvancedText 1.1")
  for (const prefix of Object.keys(parsers)) {
    if (library.startsWith(prefix)) {
      return parsers[prefix]
    }
  }
  
  return undefined
}

export function parseAction(action: H5PAction, pkg: H5PPackage): { type: SemanticElementType; content: SemanticContent } {
  const library = action.library
  const parser = getParser(library)
  
  if (parser) {
    const content = parser(action, pkg)
    return { type: getElementType(library), content }
  }
  
  // Unknown content type
  return {
    type: 'unknown',
    content: {
      type: 'unknown',
      library,
      rawParams: action.params as Record<string, unknown>,
    },
  }
}

function getElementType(library: string): SemanticElementType {
  if (library.startsWith('H5P.AdvancedText')) return 'text'
  if (library.startsWith('H5P.Text')) return 'text'
  if (library.startsWith('H5P.Image')) return 'image'
  if (library.startsWith('H5P.Video')) return 'video'
  if (library.startsWith('H5P.Audio')) return 'audio'
  if (library.startsWith('H5P.Link')) return 'link'
  if (library.startsWith('H5P.Table')) return 'table'
  if (library.startsWith('H5P.Shape')) return 'shape'
  if (library.startsWith('H5P.MultiChoice')) return 'multichoice'
  if (library.startsWith('H5P.SingleChoiceSet')) return 'singlechoice'
  if (library.startsWith('H5P.Summary')) return 'summary'
  if (library.startsWith('H5P.TrueFalse')) return 'truefalse'
  if (library.startsWith('H5P.Blanks')) return 'blanks'
  if (library.startsWith('H5P.DragQuestion')) return 'dragquestion'
  if (library.startsWith('H5P.DragText')) return 'dragtext'
  if (library.startsWith('H5P.MarkTheWords')) return 'markthewords'
  if (library.startsWith('H5P.InteractiveVideo')) return 'interactivevideo'
  return 'unknown'
}

// Register all parsers
registerParser('H5P.AdvancedText', parseAdvancedText)
registerParser('H5P.Text', parseAdvancedText)
registerParser('H5P.Image', parseImage)
registerParser('H5P.Video', parseVideo)
registerParser('H5P.Audio', parseAudio)
registerParser('H5P.Link', parseLink)
registerParser('H5P.Table', parseTable)
registerParser('H5P.Shape', parseShape)
registerParser('H5P.MultiChoice', parseMultiChoice)
registerParser('H5P.SingleChoiceSet', parseSingleChoiceSet)
registerParser('H5P.Summary', parseSummary)
registerParser('H5P.TrueFalse', parseTrueFalse)
registerParser('H5P.Blanks', parseBlanks)
registerParser('H5P.DragQuestion', parseDragQuestion)
registerParser('H5P.DragText', parseDragText)
registerParser('H5P.MarkTheWords', parseMarkTheWords)

export { parseElement } from './course-presentation'

