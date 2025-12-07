import { useState } from 'react'
import { useSemanticStore } from '../../hooks/useSemanticStore'

interface MediaManagerProps {
  slideIndex: number
}

export default function MediaManager({ slideIndex: _slideIndex }: MediaManagerProps) {
  const { semanticJson } = useSemanticStore()
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'audio'>('images')
  
  if (!semanticJson) return null
  
  const { media } = semanticJson
  
  const tabs = [
    { id: 'images' as const, label: 'Images', count: media.images.length },
    { id: 'videos' as const, label: 'Videos', count: media.videos.length },
    { id: 'audio' as const, label: 'Audio', count: media.audio.length },
  ]
  
  const activeItems = media[activeTab]
  
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3">Media Library</h3>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-700 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {/* Media grid */}
      {activeItems.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {activeItems.map((item) => (
            <MediaItem key={item.id} item={item} type={activeTab} />
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-8">
          No {activeTab} in this package
        </p>
      )}
    </div>
  )
}

interface MediaItemProps {
  item: {
    id: string
    path: string
    mime: string
    blobUrl?: string
    dimensions?: { width: number; height: number }
  }
  type: 'images' | 'videos' | 'audio'
}

function MediaItem({ item, type }: MediaItemProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const filename = item.path.split('/').pop() || item.path
  
  return (
    <div 
      className="relative group bg-slate-700 rounded-lg overflow-hidden cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      {type === 'images' && item.blobUrl && (
        <img
          src={item.blobUrl}
          alt={filename}
          className="w-full h-24 object-cover"
        />
      )}
      
      {type === 'videos' && (
        <div className="w-full h-24 flex items-center justify-center bg-slate-600">
          <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </div>
      )}
      
      {type === 'audio' && (
        <div className="w-full h-24 flex items-center justify-center bg-slate-600">
          <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Overlay with filename */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white truncate">{filename}</p>
      </div>
      
      {/* Details modal */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-slate-800 rounded-xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">Media Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {type === 'images' && item.blobUrl && (
              <img
                src={item.blobUrl}
                alt={filename}
                className="w-full rounded-lg mb-4"
              />
            )}
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Filename</span>
                <span className="text-slate-200">{filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MIME Type</span>
                <span className="text-slate-200">{item.mime}</span>
              </div>
              {item.dimensions && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Dimensions</span>
                  <span className="text-slate-200">{item.dimensions.width} × {item.dimensions.height}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Path</span>
                <span className="text-slate-200 text-xs">{item.path}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

