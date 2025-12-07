import type { H5PPackage, H5PCoursePresentation, H5PSlide, H5PInteractiveVideo, H5PElement } from '../h5p/types'
import type { 
  SemanticPackage, 
  SemanticNode,
  SemanticStructure,
  SemanticInteractive,
  SemanticMediaManifest,
  SemanticMediaItem,
  SemanticQuizContent,
  SectionType,
  HeadingLevel,
  SemanticRole,
} from './schema'
import { parseAction } from '../h5p/content-types/index'

let nodeIdCounter = 0

function resetNodeIdCounter(): void {
  nodeIdCounter = 0
}

function generateNodeId(prefix: string): string {
  return `${prefix}-${nodeIdCounter++}`
}

/**
 * Transform an H5P package to semantic JSON format with heading-based structure
 */
export function transformToSemantic(pkg: H5PPackage): SemanticPackage {
  const { metadata, content } = pkg
  resetNodeIdCounter()
  
  const mainLibrary = metadata.mainLibrary
  
  let structure: SemanticStructure
  let interactives: SemanticInteractive[] = []
  
  if (mainLibrary.includes('CoursePresentation')) {
    const result = transformCoursePresentation(content as H5PCoursePresentation, pkg)
    structure = result.structure
    interactives = result.interactives
  } else if (mainLibrary.includes('InteractiveVideo')) {
    const result = transformInteractiveVideo(content as H5PInteractiveVideo, pkg)
    structure = result.structure
    interactives = result.interactives
  } else {
    structure = { children: [] }
  }
  
  const media = buildMediaManifest(pkg)
  const id = generateId(metadata.title || 'untitled')
  
  return {
    id,
    title: metadata.title || 'Untitled',
    language: metadata.language || metadata.defaultLanguage || 'en',
    contentType: mainLibrary,
    metadata: {
      license: metadata.license,
      mainLibrary: metadata.mainLibrary,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    structure,
    interactives,
    media,
  }
}

/**
 * Section type patterns detected from keywords
 */
const SECTION_PATTERNS: Array<{ pattern: RegExp; type: SectionType }> = [
  { pattern: /^Task\s*\d+/i, type: 'task' },
  { pattern: /^Optional\s*task/i, type: 'optional' },
  { pattern: /^Note:/i, type: 'note' },
  { pattern: /^Summary/i, type: 'summary' },
  { pattern: /^Start|^Introduction|^Intro/i, type: 'intro' },
  { pattern: /^Next\s*steps/i, type: 'next-steps' },
  { pattern: /^Deep\s*dive|^Further|^Explore/i, type: 'deep-dive' },
]

function detectSectionType(keyword: string): { type: SectionType; isNewSection: boolean } {
  for (const { pattern, type } of SECTION_PATTERNS) {
    if (pattern.test(keyword)) {
      return { type, isNewSection: true }
    }
  }
  return { type: 'generic', isNewSection: false }
}

/**
 * Strip HTML tags and decode entities from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Check if text looks like navigation (e.g., "Next>>", ">>", "Previous", etc.)
 */
function isNavigationText(text: string): boolean {
  const navPatterns = [
    /^(next|prev|previous|back|forward)\s*[>»→←<«]*/i,
    /^[>»→←<«]+\s*(next|prev|previous|back|forward)?$/i,
    /^[>»→]+$/,
    /^[<«←]+$/,
  ]
  const cleanText = stripHtml(text).trim()
  return navPatterns.some(p => p.test(cleanText))
}

/**
 * Normalize a title for comparison (lowercase, strip punctuation)
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Extract heading from HTML text content
 */
function extractHeadingFromHtml(html: string): { level: HeadingLevel; text: string } | null {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is)
  if (h1Match) return { level: 1, text: stripHtml(h1Match[1]) }
  
  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/is)
  if (h2Match) return { level: 2, text: stripHtml(h2Match[1]) }
  
  const h3Match = html.match(/<h3[^>]*>(.*?)<\/h3>/is)
  if (h3Match) return { level: 3, text: stripHtml(h3Match[1]) }
  
  const h4Match = html.match(/<h4[^>]*>(.*?)<\/h4>/is)
  if (h4Match) return { level: 4, text: stripHtml(h4Match[1]) }
  
  const h5Match = html.match(/<h5[^>]*>(.*?)<\/h5>/is)
  if (h5Match) return { level: 5, text: stripHtml(h5Match[1]) }
  
  return null
}

/**
 * Auto-classify an element's semantic role based on content
 */
function classifyElementRole(element: H5PElement, isFirst: boolean, prevElement?: H5PElement): SemanticRole {
  const library = element.action?.library || ''
  const params = element.action?.params
  
  // Navigation elements without actions are always just content
  if (!element.action && (element.goToSlide !== undefined || element.goToSlideType)) {
    return 'content'
  }
  
  // Text elements
  if (library.includes('AdvancedText') || library.includes('Text')) {
    const textContent = params?.text as string | undefined
    if (!textContent) return 'text'
    
    const plainText = stripHtml(textContent)
    
    // Navigation-like text should never be a heading
    if (isNavigationText(textContent)) {
      return 'content'
    }
    
    // Very short or empty text is not a heading
    if (plainText.length < 3) {
      return 'text'
    }
    
    // Check for heading tags
    if (extractHeadingFromHtml(textContent)) {
      return 'heading'
    }
    
    // Short text at the start is likely a heading (but not if it's navigation)
    if (isFirst && plainText.length < 60 && plainText.length >= 3) {
      return 'heading'
    }
    
    // Short text after media is likely a caption
    if (prevElement) {
      const prevLib = prevElement.action?.library || ''
      if (prevLib.includes('Image') || prevLib.includes('Video') || prevLib.includes('Audio')) {
        if (plainText.length < 100) {
          return 'caption'
        }
      }
    }
    
    return 'text'
  }
  
  // Media elements are content
  if (library.includes('Image') || library.includes('Video') || library.includes('Audio')) {
    return 'content'
  }
  
  // Quiz elements are content
  if (library.includes('MultiChoice') || library.includes('TrueFalse') || 
      library.includes('Blanks') || library.includes('DragText') ||
      library.includes('Summary') || library.includes('MarkTheWords') ||
      library.includes('DragQuestion') || library.includes('SingleChoice')) {
    return 'content'
  }
  
  return 'content'
}

/**
 * Transform a single H5P element to a semantic node
 */
function transformElement(element: H5PElement, pkg: H5PPackage, isFirst: boolean, prevElement?: H5PElement): SemanticNode {
  const nodeId = generateNodeId('node')
  const params = element.action?.params
  
  // Determine semantic role
  const semanticRole = classifyElementRole(element, isFirst, prevElement)
  
  // For heading role, extract heading level and text
  if (semanticRole === 'heading') {
    const textContent = params?.text as string | undefined
    if (textContent) {
      const extracted = extractHeadingFromHtml(textContent)
      if (extracted) {
        // This is a proper HTML heading
        return {
          id: nodeId,
          headingLevel: extracted.level,
          title: extracted.text,
          semanticRole: 'heading',
          position: {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          },
        }
      }
      
      // Short text treated as heading - default to H3 within slide
      const plainText = stripHtml(textContent)
      return {
        id: nodeId,
        headingLevel: 3,
        title: plainText,
        semanticRole: 'heading',
        position: {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        },
      }
    }
  }
  
  // Navigation-only element
  if (!element.action) {
    return {
      id: nodeId,
      semanticRole: 'content',
      contentType: 'navigation',
      content: {
        type: 'navigation',
        targetSlide: element.goToSlide,
        navigationType: element.goToSlideType || 'next',
        title: element.title,
      },
      position: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      },
      isButton: element.displayAsButton,
      isHidden: element.invisible,
      navigation: {
        goToSlide: element.goToSlide,
        goToType: element.goToSlideType,
      },
    }
  }
  
  // Parse the action content
  const { type, content } = parseAction(element.action, pkg)
  
  return {
    id: nodeId,
    semanticRole,
    contentType: type,
    content,
    position: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    isButton: element.displayAsButton,
    isHidden: element.invisible,
    navigation: element.goToSlide !== undefined ? {
      goToSlide: element.goToSlide,
      goToType: element.goToSlideType,
    } : undefined,
  }
}

/**
 * Transform CoursePresentation to heading-based structure
 */
function transformCoursePresentation(
  content: H5PCoursePresentation,
  pkg: H5PPackage
): { structure: SemanticStructure; interactives: SemanticInteractive[] } {
  const slides = content.presentation?.slides || []
  const interactives: SemanticInteractive[] = []
  
  // First pass: convert slides to H2 nodes with their content
  const slideNodes: SemanticNode[] = []
  
  for (let index = 0; index < slides.length; index++) {
    const slide = slides[index]
    const keyword = getSlideTitle(slide, index)
    const { type: sectionType } = detectSectionType(keyword)
    
    // Transform all elements
    const h5pElements = slide.elements || []
    const contentNodes: SemanticNode[] = []
    
    for (let i = 0; i < h5pElements.length; i++) {
      const element = h5pElements[i]
      const prevElement = i > 0 ? h5pElements[i - 1] : undefined
      const node = transformElement(element, pkg, i === 0, prevElement)
      
      // Track interactives (quizzes)
      if (node.content?.type === 'quiz') {
        interactives.push({
          id: `interactive-${interactives.length}`,
          type: (node.content as SemanticQuizContent).quizType,
          slideRef: `slide-${index}`,
          elementRef: node.id,
          content: node.content as SemanticQuizContent,
        })
      }
      
      contentNodes.push(node)
    }
    
    // Check if this slide only contains navigation elements
    const hasRealContent = contentNodes.some(node => {
      // Navigation elements are not "real" content
      if (node.contentType === 'navigation') return false
      // Empty text is not real content
      if (node.content?.type === 'text') {
        const text = (node.content as { plainText?: string }).plainText || ''
        if (text.length < 3) return false
      }
      return true
    })
    
    // Skip creating H2 for navigation-only slides
    if (!hasRealContent && isNavigationText(keyword)) {
      // Still include nav elements as flat content in the previous slide if possible
      if (slideNodes.length > 0 && contentNodes.length > 0) {
        const prevSlide = slideNodes[slideNodes.length - 1]
        if (prevSlide.children) {
          prevSlide.children.push(...contentNodes)
        }
      }
      continue
    }
    
    // Organize content and remove duplicates
    const organizedContent = organizeContentUnderHeadings(contentNodes, keyword)
    
    // Build H2 slide node
    const slideNode: SemanticNode = {
      id: `slide-${index}`,
      headingLevel: 2,
      title: keyword,
      sectionType,
      keywords: getSlideKeywords(slide),
      backgroundColor: slide.slideBackgroundSelector?.fillSlideBackground || 
                       content.presentation?.globalBackgroundSelector?.fillGlobalBackground,
      children: organizedContent,
    }
    
    slideNodes.push(slideNode)
  }
  
  // Second pass: group slides into H1 sections, avoiding duplicate titles
  const sectionNodes = groupSlidesIntoH1Sections(slideNodes)
  
  return { structure: { children: sectionNodes }, interactives }
}

/**
 * Organize content nodes under their heading nodes
 * If a heading (H3+) is found, subsequent content becomes its children
 * Also removes headings that duplicate the slide title
 */
function organizeContentUnderHeadings(nodes: SemanticNode[], slideTitle?: string): SemanticNode[] {
  const result: SemanticNode[] = []
  let currentHeading: SemanticNode | null = null
  const normalizedSlideTitle = slideTitle ? normalizeTitle(slideTitle) : ''
  
  for (const node of nodes) {
    // Skip headings that duplicate the slide title
    if (node.headingLevel && node.title) {
      const normalizedNodeTitle = normalizeTitle(node.title)
      if (normalizedSlideTitle && normalizedNodeTitle === normalizedSlideTitle) {
        // This heading duplicates the slide title, skip it
        continue
      }
    }
    
    // If this is a sub-heading (H3+), start collecting children for it
    if (node.headingLevel && node.headingLevel >= 3) {
      // Save previous heading if it has content
      if (currentHeading) {
        // Only keep headings that have children
        if (currentHeading.children && currentHeading.children.length > 0) {
          result.push(currentHeading)
        } else {
          // Convert empty heading to just text content
          const textNode: SemanticNode = {
            id: currentHeading.id,
            semanticRole: 'text',
            contentType: 'text',
            content: {
              type: 'text',
              markdown: currentHeading.title || '',
              plainText: currentHeading.title || '',
            },
            position: currentHeading.position,
          }
          result.push(textNode)
        }
      }
      currentHeading = { ...node, children: [] }
    } else if (currentHeading) {
      // Add to current heading's children
      currentHeading.children!.push(node)
    } else {
      // No heading context, add directly
      result.push(node)
    }
  }
  
  // Don't forget the last heading
  if (currentHeading) {
    // Only keep headings that have children
    if (currentHeading.children && currentHeading.children.length > 0) {
      result.push(currentHeading)
    } else {
      // Convert empty heading to just text content
      const textNode: SemanticNode = {
        id: currentHeading.id,
        semanticRole: 'text',
        contentType: 'text',
        content: {
          type: 'text',
          markdown: currentHeading.title || '',
          plainText: currentHeading.title || '',
        },
        position: currentHeading.position,
      }
      result.push(textNode)
    }
  }
  
  return result
}

/**
 * Group H2 slide nodes into H1 section nodes
 */
function groupSlidesIntoH1Sections(slideNodes: SemanticNode[]): SemanticNode[] {
  const sections: SemanticNode[] = []
  let currentSection: SemanticNode | null = null
  
  for (const slide of slideNodes) {
    const keyword = slide.title || ''
    const { isNewSection, type: sectionType } = detectSectionType(keyword)
    
    // Check if first content node is an H1 heading
    const firstChild = slide.children?.[0]
    const hasH1Heading = firstChild?.headingLevel === 1
    
    // Check if first content node is an H2 heading that duplicates slide title
    const hasH2DuplicateTitle = firstChild?.headingLevel === 2 && 
      firstChild?.title && 
      normalizeTitle(firstChild.title) === normalizeTitle(keyword)
    
    // Start new section if:
    // 1. It's a recognized section pattern
    // 2. First slide
    // 3. Slide contains H1 heading
    const shouldStartNewSection = isNewSection || !currentSection || hasH1Heading
    
    if (shouldStartNewSection) {
      // Determine section title
      let sectionTitle = keyword
      if (hasH1Heading && firstChild?.title) {
        sectionTitle = firstChild.title
        // Promote H1 content's heading level info to section, remove from children
        slide.children = slide.children?.slice(1)
      }
      
      // Remove duplicate H2 heading from children if it matches the slide title
      if (hasH2DuplicateTitle) {
        slide.children = slide.children?.slice(1)
      }
      
      // If section title matches slide title, and this is the only slide in section so far,
      // don't duplicate - just use the section title
      const normalizedSectionTitle = normalizeTitle(sectionTitle)
      const normalizedSlideTitle = normalizeTitle(slide.title || '')
      
      if (normalizedSectionTitle === normalizedSlideTitle) {
        // Keep only the H1 (section) level, slide becomes its content container
        // but we don't repeat the title at H2
        slide.title = undefined  // Clear slide title to avoid duplication
      }
      
      currentSection = {
        id: `section-${sections.length}`,
        headingLevel: 1,
        title: sectionTitle,
        sectionType: sectionType !== 'generic' ? sectionType : slide.sectionType,
        children: [slide],
      }
      sections.push(currentSection)
    } else {
      // Remove duplicate H2 heading from children if it matches the slide title
      if (hasH2DuplicateTitle) {
        slide.children = slide.children?.slice(1)
      }
      
      currentSection!.children!.push(slide)
    }
  }
  
  // If no sections, create a default one
  if (sections.length === 0 && slideNodes.length > 0) {
    sections.push({
      id: 'section-main',
      headingLevel: 1,
      title: 'Main',
      children: slideNodes,
    })
  }
  
  return sections
}

function getSlideTitle(slide: H5PSlide, index: number): string {
  const keywords = slide.keywords || []
  if (keywords.length > 0 && keywords[0].main) {
    return keywords[0].main
  }
  return `Slide ${index + 1}`
}

function getSlideKeywords(slide: H5PSlide): string[] {
  const keywords = slide.keywords || []
  const result: string[] = []
  
  for (const kw of keywords) {
    if (kw.main) result.push(kw.main)
    if (kw.subs) result.push(...kw.subs)
  }
  
  return result
}

/**
 * Transform InteractiveVideo content
 */
function transformInteractiveVideo(
  content: H5PInteractiveVideo,
  _pkg: H5PPackage
): { structure: SemanticStructure; interactives: SemanticInteractive[] } {
  const video = content.interactiveVideo?.video
  const title = video?.startScreenOptions?.title || 'Interactive Video'
  
  // Create H2 slide node for the video
  const slideNode: SemanticNode = {
    id: 'slide-0',
    headingLevel: 2,
    title,
    children: [], // Video interactions would be parsed here
  }
  
  // Wrap in H1 section
  const sectionNode: SemanticNode = {
    id: 'section-main',
    headingLevel: 1,
    title: 'Video',
    children: [slideNode],
  }
  
  return {
    structure: { children: [sectionNode] },
    interactives: [],
  }
}

function buildMediaManifest(_pkg: H5PPackage): SemanticMediaManifest {
  const images: SemanticMediaItem[] = []
  const videos: SemanticMediaItem[] = []
  const audio: SemanticMediaItem[] = []
  
  let imageCount = 0
  let videoCount = 0
  let audioCount = 0
  
  for (const [path, blobUrl] of _pkg.media.entries()) {
    const ext = path.toLowerCase().substring(path.lastIndexOf('.'))
    const mime = getMimeType(ext)
    
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
      images.push({
        id: `img-${imageCount++}`,
        path,
        mime,
        blobUrl,
      })
    } else if (['.mp4', '.webm'].includes(ext)) {
      videos.push({
        id: `vid-${videoCount++}`,
        path,
        mime,
        blobUrl,
      })
    } else if (['.mp3', '.ogg', '.wav'].includes(ext)) {
      audio.push({
        id: `aud-${audioCount++}`,
        path,
        mime,
        blobUrl,
      })
    }
  }
  
  return { images, videos, audio }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function generateId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'untitled'
}
