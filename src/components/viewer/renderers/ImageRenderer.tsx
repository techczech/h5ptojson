import { useState } from 'react'
import type { SemanticContent, SemanticImageContent } from '../../../lib/semantic/schema'

interface ImageRendererProps {
  content: SemanticContent
}

export default function ImageRenderer({ content }: ImageRendererProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  
  if (content.type !== 'image') return null
  
  const imageContent = content as SemanticImageContent
  const src = imageContent.blobUrl || imageContent.path
  
  if (!src) {
    return (
      <div className="text-slate-500 italic text-sm">
        Image not available
      </div>
    )
  }
  
  return (
    <>
      <img
        src={src}
        alt={imageContent.alt || ''}
        className="max-w-full h-auto rounded cursor-zoom-in"
        onClick={() => setIsZoomed(true)}
      />
      
      {/* Zoom modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={src}
            alt={imageContent.alt || ''}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300"
            onClick={() => setIsZoomed(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}


