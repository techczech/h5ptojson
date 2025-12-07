// Semantic JSON output schema - clean, normalized representation of H5P content
// Uses a heading-based hierarchy: H1 = sections, H2 = slides/pages, H3-H5 = sub-sections

export interface SemanticPackage {
  id: string
  title: string
  language: string
  contentType: string
  metadata: SemanticMetadata
  structure: SemanticStructure
  interactives: SemanticInteractive[]
  media: SemanticMediaManifest
}

export interface SemanticMetadata {
  license?: string
  mainLibrary: string
  created?: string
  modified?: string
  authors?: string[]
}

// Structure is now a tree of semantic nodes
export interface SemanticStructure {
  children: SemanticNode[]
}

// Heading levels: H1 = section, H2 = slide/page, H3-H5 = sub-sections
export type HeadingLevel = 1 | 2 | 3 | 4 | 5

// Semantic role for content nodes
export type SemanticRole = 
  | 'heading'      // A heading at any level
  | 'text'         // Body text content
  | 'caption'      // Caption for media
  | 'description'  // Description/alt text
  | 'content'      // Generic content (media, quiz, etc.)
  | 'label'        // Short label
  | 'popup'        // Popup/tooltip content

// Section types for semantic annotation
export type SectionType = 'task' | 'note' | 'optional' | 'summary' | 'intro' | 'next-steps' | 'deep-dive' | 'generic'

// Unified semantic node - can be a heading or content
export interface SemanticNode {
  id: string
  
  // For heading nodes (H1-H5)
  headingLevel?: HeadingLevel
  title?: string                    // Heading text
  sectionType?: SectionType         // Semantic annotation
  
  // For content nodes
  semanticRole?: SemanticRole       // Role of this content
  contentType?: SemanticContentType // Type of content
  content?: SemanticContent         // Actual content data
  
  // Original position data (for layout reference)
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  
  // Metadata
  keywords?: string[]
  backgroundColor?: string
  isButton?: boolean
  isHidden?: boolean
  navigation?: {
    goToSlide?: number
    goToType?: 'specified' | 'next' | 'previous'
  }
  
  // Tree structure
  children?: SemanticNode[]
}

// Legacy type aliases for backward compatibility
export type SemanticSection = SemanticNode  // H1 nodes
export type SemanticSlide = SemanticNode    // H2 nodes  
export type SemanticElement = SemanticNode  // Content nodes

// Legacy semantic element tag (maps to SemanticRole)
export type SemanticElementTag = SemanticRole

// Content types for terminal nodes
export type SemanticContentType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'link'
  | 'table'
  | 'shape'
  | 'multichoice'
  | 'summary'
  | 'truefalse'
  | 'blanks'
  | 'dragquestion'
  | 'dragtext'
  | 'markthewords'
  | 'singlechoice'
  | 'interactivevideo'
  | 'navigation'
  | 'unknown'

// Legacy alias
export type SemanticElementType = SemanticContentType

export type SemanticContent = 
  | SemanticTextContent
  | SemanticImageContent
  | SemanticVideoContent
  | SemanticAudioContent
  | SemanticLinkContent
  | SemanticTableContent
  | SemanticShapeContent
  | SemanticQuizContent
  | SemanticNavigationContent
  | SemanticGroupContent
  | SemanticUnknownContent

export interface SemanticTextContent {
  type: 'text'
  markdown: string   // Semantic markdown content
  plainText: string  // Plain text for display/search
  rawHtml?: string   // Original HTML preserved for reference (optional)
}

export interface SemanticImageContent {
  type: 'image'
  path: string
  blobUrl?: string
  alt?: string
  dimensions?: { width: number; height: number }
}

export interface SemanticVideoContent {
  type: 'video'
  sources: Array<{
    path: string
    mime: string
    blobUrl?: string
  }>
  isYouTube?: boolean
  youtubeId?: string
}

export interface SemanticAudioContent {
  type: 'audio'
  sources: Array<{
    path: string
    mime: string
    blobUrl?: string
  }>
}

export interface SemanticLinkContent {
  type: 'link'
  url: string
  title?: string
}

export interface SemanticTableContent {
  type: 'table'
  html: string
}

export interface SemanticShapeContent {
  type: 'shape'
  shapeType: 'rectangle' | 'circle' | 'line' | string
  fillColor?: string
  borderColor?: string
  borderWidth?: number
}

export interface SemanticNavigationContent {
  type: 'navigation'
  targetSlide?: number
  navigationType: 'specified' | 'next' | 'previous'
  title?: string
}

export interface SemanticUnknownContent {
  type: 'unknown'
  library: string
  rawParams: Record<string, unknown>
}

// Group content is now represented as heading nodes with children
// This interface is kept for legacy compatibility during migration
export interface SemanticGroupContent {
  type: 'group'
  label?: string
}

// Quiz types
export interface SemanticQuizContent {
  type: 'quiz'
  quizType: 'multichoice' | 'summary' | 'truefalse' | 'blanks' | 'dragquestion' | 'dragtext' | 'markthewords' | 'singlechoice'
  data: SemanticQuizData
}

export type SemanticQuizData = 
  | SemanticMultiChoiceData
  | SemanticSummaryData
  | SemanticTrueFalseData
  | SemanticBlanksData
  | SemanticDragTextData
  | SemanticMarkTheWordsData

export interface SemanticMultiChoiceData {
  quizType: 'multichoice' | 'singlechoice'
  question: string
  questionHtml: string
  answers: Array<{
    text: string
    textHtml: string
    correct: boolean
    tip?: string
    feedback?: string
  }>
  settings: {
    randomize: boolean
    singleAnswer: boolean
  }
}

export interface SemanticSummaryData {
  quizType: 'summary'
  intro: string
  statements: Array<{
    correctAnswer: string
    distractors: string[]
    tip?: string
  }>
}

export interface SemanticTrueFalseData {
  quizType: 'truefalse'
  question: string
  questionHtml: string
  correctAnswer: boolean
  trueLabel: string
  falseLabel: string
}

export interface SemanticBlanksData {
  quizType: 'blanks'
  text: string
  blanks: Array<{
    position: number
    answers: string[]
  }>
}

export interface SemanticDragTextData {
  quizType: 'dragtext'
  text: string
  droppables: Array<{
    text: string
    position: number
  }>
}

export interface SemanticMarkTheWordsData {
  quizType: 'markthewords'
  text: string
  correctWords: string[]
}

// Interactive element reference
export interface SemanticInteractive {
  id: string
  type: string
  slideRef: string
  elementRef: string
  content: SemanticQuizContent
}

// Media manifest
export interface SemanticMediaManifest {
  images: SemanticMediaItem[]
  videos: SemanticMediaItem[]
  audio: SemanticMediaItem[]
}

export interface SemanticMediaItem {
  id: string
  path: string
  mime: string
  blobUrl?: string
  dimensions?: { width: number; height: number }
  isExternal?: boolean
  externalUrl?: string
}

// Helper functions for working with the semantic tree

/**
 * Check if a node is a heading node (H1-H5)
 */
export function isHeadingNode(node: SemanticNode): boolean {
  return node.headingLevel !== undefined
}

/**
 * Check if a node is a content node (has actual content)
 */
export function isContentNode(node: SemanticNode): boolean {
  return node.content !== undefined
}

/**
 * Get all H1 (section) nodes from structure
 */
export function getSectionNodes(structure: SemanticStructure): SemanticNode[] {
  return structure.children.filter(n => n.headingLevel === 1)
}

/**
 * Get all H2 (slide/page) nodes from a section or structure
 */
export function getSlideNodes(parent: SemanticNode | SemanticStructure): SemanticNode[] {
  const children = 'children' in parent ? parent.children : []
  return (children || []).filter(n => n.headingLevel === 2)
}

/**
 * Get the display label for a node
 */
export function getNodeLabel(node: SemanticNode): string {
  // For heading nodes, use the title
  if (node.headingLevel && node.title) {
    return node.title
  }
  
  // For heading nodes without a title (e.g., content container)
  if (node.headingLevel && !node.title) {
    // Try to get label from first child
    if (node.children && node.children.length > 0) {
      const firstChild = node.children[0]
      if (firstChild.title) return firstChild.title
      if (firstChild.content?.type === 'text') {
        const text = (firstChild.content as SemanticTextContent).plainText
        return text.length > 30 ? text.substring(0, 30) + '…' : text || 'Content'
      }
    }
    return `Content (${node.children?.length || 0} items)`
  }
  
  // For content nodes, generate label from content
  if (node.content) {
    switch (node.content.type) {
      case 'text':
        const text = (node.content as SemanticTextContent).plainText
        return text.length > 40 ? text.substring(0, 40) + '…' : text || 'Empty text'
      case 'image':
        return (node.content as SemanticImageContent).alt || 'Image'
      case 'video':
        return 'Video'
      case 'audio':
        return 'Audio'
      case 'quiz':
        return `Quiz: ${(node.content as SemanticQuizContent).quizType}`
      case 'navigation':
        return 'Navigation'
      default:
        return node.contentType || 'Content'
    }
  }
  
  return node.id
}

