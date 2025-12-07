import type { H5PAction, H5PPackage } from '../types'
import type { 
  SemanticTextContent, 
  SemanticImageContent, 
  SemanticVideoContent,
  SemanticAudioContent,
  SemanticLinkContent,
  SemanticTableContent,
  SemanticShapeContent,
} from '../../semantic/schema'
import { getMediaUrl } from '../parser'
import { htmlToMarkdown, markdownToPlainText } from '../../semantic/html-to-markdown'

/**
 * Strip HTML tags and get plain text
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

/**
 * Parse H5P.AdvancedText or H5P.Text
 */
export function parseAdvancedText(action: H5PAction, _pkg: H5PPackage): SemanticTextContent {
  const params = action.params as { text?: string }
  const html = params.text || ''
  
  // Convert HTML to semantic Markdown
  const markdown = htmlToMarkdown(html)
  
  return {
    type: 'text',
    markdown,
    plainText: markdownToPlainText(markdown),
    rawHtml: html, // Preserve original HTML for reference
  }
}

/**
 * Parse H5P.Image
 */
export function parseImage(action: H5PAction, pkg: H5PPackage): SemanticImageContent {
  const params = action.params as { 
    file?: { path?: string; width?: number; height?: number }
    alt?: string
    contentName?: string
  }
  
  const file = params.file || {}
  const path = file.path || ''
  
  return {
    type: 'image',
    path,
    blobUrl: path ? getMediaUrl(pkg, path) : undefined,
    alt: params.alt || params.contentName || '',
    dimensions: file.width && file.height ? { width: file.width, height: file.height } : undefined,
  }
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string): string | undefined {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return undefined
}

/**
 * Parse H5P.Video
 */
export function parseVideo(action: H5PAction, pkg: H5PPackage): SemanticVideoContent {
  const params = action.params as {
    sources?: Array<{ path?: string; mime?: string }>
  }
  
  const sources = (params.sources || []).map((source) => {
    const path = source.path || ''
    const mime = source.mime || ''
    const isYouTube = mime === 'video/YouTube' || path.includes('youtube') || path.includes('youtu.be')
    
    return {
      path,
      mime,
      blobUrl: isYouTube ? undefined : getMediaUrl(pkg, path),
    }
  })
  
  // Check if any source is YouTube
  const youtubeSource = sources.find(s => 
    s.mime === 'video/YouTube' || s.path.includes('youtube') || s.path.includes('youtu.be')
  )
  
  return {
    type: 'video',
    sources,
    isYouTube: !!youtubeSource,
    youtubeId: youtubeSource ? extractYouTubeId(youtubeSource.path) : undefined,
  }
}

/**
 * Parse H5P.Audio
 */
export function parseAudio(action: H5PAction, pkg: H5PPackage): SemanticAudioContent {
  const params = action.params as {
    files?: Array<{ path?: string; mime?: string }>
  }
  
  const sources = (params.files || []).map((file) => ({
    path: file.path || '',
    mime: file.mime || 'audio/mpeg',
    blobUrl: file.path ? getMediaUrl(pkg, file.path) : undefined,
  }))
  
  return {
    type: 'audio',
    sources,
  }
}

/**
 * Parse H5P.Link
 */
export function parseLink(action: H5PAction, _pkg: H5PPackage): SemanticLinkContent {
  const params = action.params as {
    linkWidget?: { protocol?: string; url?: string }
    title?: string
  }
  
  const widget = params.linkWidget || {}
  const protocol = widget.protocol || 'https://'
  const url = widget.url || ''
  
  return {
    type: 'link',
    url: url.startsWith('http') ? url : protocol + url,
    title: params.title || action.metadata?.title,
  }
}

/**
 * Parse H5P.Table
 */
export function parseTable(action: H5PAction, _pkg: H5PPackage): SemanticTableContent {
  const params = action.params as { text?: string }
  
  return {
    type: 'table',
    html: params.text || '',
  }
}

/**
 * Parse H5P.Shape
 */
export function parseShape(action: H5PAction, _pkg: H5PPackage): SemanticShapeContent {
  const params = action.params as {
    type?: string
    shape?: {
      fillColor?: string
      borderColor?: string
      borderWidth?: string | number
    }
  }
  
  const shape = params.shape || {}
  
  return {
    type: 'shape',
    shapeType: params.type || 'rectangle',
    fillColor: shape.fillColor,
    borderColor: shape.borderColor,
    borderWidth: typeof shape.borderWidth === 'string' ? parseInt(shape.borderWidth, 10) : shape.borderWidth,
  }
}


