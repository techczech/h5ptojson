import type { SemanticContent, SemanticTextContent } from '../../../lib/semantic/schema'
import { markdownToHtml } from '../../../lib/semantic/html-to-markdown'

interface TextRendererProps {
  content: SemanticContent
}

export default function TextRenderer({ content }: TextRendererProps) {
  if (content.type !== 'text') return null
  
  const textContent = content as SemanticTextContent
  const html = markdownToHtml(textContent.markdown || '')
  
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}


