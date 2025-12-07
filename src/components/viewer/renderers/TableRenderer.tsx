import type { SemanticContent, SemanticTableContent } from '../../../lib/semantic/schema'

interface TableRendererProps {
  content: SemanticContent
}

export default function TableRenderer({ content }: TableRendererProps) {
  if (content.type !== 'table') return null
  
  const tableContent = content as SemanticTableContent
  
  return (
    <div 
      className="overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:bg-slate-700 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:border [&_th]:border-slate-600 [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-slate-600"
      dangerouslySetInnerHTML={{ __html: tableContent.html }}
    />
  )
}


