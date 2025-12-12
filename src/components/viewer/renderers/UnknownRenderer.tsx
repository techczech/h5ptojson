import { useState } from 'react'
import type { SemanticContent, SemanticUnknownContent } from '../../../lib/semantic/schema'

interface UnknownRendererProps {
  content: SemanticContent
}

export default function UnknownRenderer({ content }: UnknownRendererProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  if (content.type !== 'unknown') return null
  
  const unknownContent = content as SemanticUnknownContent
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          Unsupported: {unknownContent.library}
        </span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          {showDetails ? 'Hide' : 'Show'} details
        </button>
      </div>
      
      {showDetails && (
        <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-48 bg-slate-800 rounded p-2">
          {JSON.stringify(unknownContent.rawParams, null, 2)}
        </pre>
      )}
    </div>
  )
}




