import type { SemanticContent, SemanticVideoContent, SemanticAudioContent } from '../../../lib/semantic/schema'

interface VideoRendererProps {
  content: SemanticContent
}

export default function VideoRenderer({ content }: VideoRendererProps) {
  if (content.type === 'video') {
    const videoContent = content as SemanticVideoContent
    
    // YouTube video
    if (videoContent.isYouTube && videoContent.youtubeId) {
      return (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${videoContent.youtubeId}`}
            className="w-full h-full rounded"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )
    }
    
    // Local video
    const source = videoContent.sources[0]
    if (source?.blobUrl) {
      return (
        <video
          controls
          className="w-full rounded"
          preload="metadata"
        >
          <source src={source.blobUrl} type={source.mime} />
          Your browser does not support video playback.
        </video>
      )
    }
    
    return (
      <div className="text-slate-500 italic text-sm">
        Video not available
      </div>
    )
  }
  
  if (content.type === 'audio') {
    const audioContent = content as SemanticAudioContent
    const source = audioContent.sources[0]
    
    if (source?.blobUrl) {
      return (
        <audio
          controls
          className="w-full"
          preload="metadata"
        >
          <source src={source.blobUrl} type={source.mime} />
          Your browser does not support audio playback.
        </audio>
      )
    }
    
    return (
      <div className="text-slate-500 italic text-sm">
        Audio not available
      </div>
    )
  }
  
  return null
}


