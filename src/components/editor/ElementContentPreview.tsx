import type { 
  SemanticElement, 
  SemanticTextContent, 
  SemanticImageContent, 
  SemanticVideoContent,
  SemanticAudioContent 
} from '../../lib/semantic/schema'
import { markdownToHtml } from '../../lib/semantic/html-to-markdown'

interface ElementContentPreviewProps {
  element: SemanticElement
}

export default function ElementContentPreview({ element }: ElementContentPreviewProps) {
  const content = element.content

  // Text content - render Markdown as HTML
  if (content.type === 'text') {
    const textContent = content as SemanticTextContent
    const html = textContent.markdown ? markdownToHtml(textContent.markdown) : '<p class="text-slate-400 italic">Empty text</p>'
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div 
          className="prose prose-sm max-w-none text-slate-800"
          style={{ color: '#1e293b' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  }

  // Image content
  if (content.type === 'image') {
    const imageContent = content as SemanticImageContent
    const src = imageContent.blobUrl || imageContent.path
    return (
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        {src ? (
          <>
            <img 
              src={src} 
              alt={imageContent.alt || 'Image'} 
              className="w-full h-auto max-h-[500px] object-contain"
            />
            {(imageContent.alt || imageContent.dimensions) && (
              <div className="p-3 bg-slate-800/80 text-center">
                {imageContent.alt && (
                  <p className="text-sm text-slate-300 italic">{imageContent.alt}</p>
                )}
                {imageContent.dimensions && (
                  <p className="text-xs text-slate-500 mt-1">
                    {imageContent.dimensions.width} × {imageContent.dimensions.height}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No image source available</p>
            <p className="text-xs mt-1">{imageContent.path}</p>
          </div>
        )}
      </div>
    )
  }

  // Video content
  if (content.type === 'video') {
    const videoContent = content as SemanticVideoContent
    
    // YouTube video
    if (videoContent.isYouTube && videoContent.youtubeId) {
      return (
        <div className="bg-slate-900 rounded-lg overflow-hidden">
          <div className="aspect-video">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoContent.youtubeId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-2 bg-slate-800/80 text-center">
            <span className="text-xs text-red-400 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              YouTube
            </span>
          </div>
        </div>
      )
    }
    
    // Local video
    const videoSrc = videoContent.sources?.[0]?.blobUrl || videoContent.sources?.[0]?.path
    return (
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        {videoSrc ? (
          <video 
            src={videoSrc} 
            controls 
            className="w-full max-h-[500px]"
          />
        ) : (
          <div className="text-slate-500 text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p>No video source available</p>
          </div>
        )}
      </div>
    )
  }

  // Audio content
  if (content.type === 'audio') {
    const audioContent = content as SemanticAudioContent
    const audioSrc = audioContent.sources?.[0]?.blobUrl || audioContent.sources?.[0]?.path
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          {audioSrc ? (
            <audio src={audioSrc} controls className="flex-1" />
          ) : (
            <span className="text-slate-500">No audio source available</span>
          )}
        </div>
      </div>
    )
  }

  // Table content
  if (content.type === 'table') {
    return (
      <div className="bg-white rounded-lg p-4 overflow-auto shadow-lg">
        <div 
          className="prose prose-sm max-w-none"
          style={{ color: '#1e293b' }}
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      </div>
    )
  }

  // Link content
  if (content.type === 'link') {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <a 
              href={content.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline truncate block"
            >
              {content.title || content.url}
            </a>
            {content.title && (
              <p className="text-xs text-slate-500 truncate">{content.url}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Shape content
  if (content.type === 'shape') {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-16 h-16 rounded"
            style={{ 
              backgroundColor: content.fillColor || '#475569',
              border: content.borderWidth ? `${content.borderWidth}px solid ${content.borderColor || '#64748b'}` : undefined,
              borderRadius: content.shapeType === 'circle' ? '50%' : '0.25rem'
            }}
          />
          <div>
            <p className="text-slate-300 capitalize">{content.shapeType}</p>
            {content.fillColor && (
              <p className="text-xs text-slate-500">Fill: {content.fillColor}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Quiz/interactive content
  if (content.type === 'quiz') {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-slate-300">Interactive Quiz</p>
            <p className="text-xs text-slate-500 capitalize">{content.quizType}</p>
          </div>
        </div>
      </div>
    )
  }

  // Default: show content type
  return (
    <div className="bg-slate-800 rounded-lg p-4 text-center">
      <p className="text-slate-400 capitalize">{content.type} element</p>
    </div>
  )
}
