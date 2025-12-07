import type { SemanticContent, SemanticLinkContent } from '../../../lib/semantic/schema'

interface LinkRendererProps {
  content: SemanticContent
}

export default function LinkRenderer({ content }: LinkRendererProps) {
  if (content.type !== 'link') return null
  
  const linkContent = content as SemanticLinkContent
  
  return (
    <a
      href={linkContent.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-1"
    >
      {linkContent.title || linkContent.url}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}


