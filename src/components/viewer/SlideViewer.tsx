import { useSemanticStore } from '../../hooks/useSemanticStore'
import ElementRenderer from './ElementRenderer'

export default function SlideViewer() {
  const { 
    semanticJson, 
    selectedSlideIndex, 
    setSelectedSlide,
    getSlides,
    getCurrentSlide,
  } = useSemanticStore()
  
  if (!semanticJson) {
    return <div className="text-slate-400">No content loaded</div>
  }
  
  const slides = getSlides()
  const currentSlide = getCurrentSlide()
  
  return (
    <div className="flex gap-6">
      {/* Slide navigation sidebar */}
      <aside className="w-64 flex-shrink-0">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Slides</h3>
        <nav className="space-y-1">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setSelectedSlide(idx)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${idx === selectedSlideIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
                }
              `}
            >
              <span className="text-slate-500 mr-2">{idx + 1}.</span>
              {slide.title}
            </button>
          ))}
        </nav>
      </aside>
      
      {/* Main slide area */}
      <main className="flex-1">
        {currentSlide ? (
          <div 
            className="bg-slate-800 rounded-xl overflow-hidden"
            style={{ 
              backgroundColor: currentSlide.backgroundColor || '#1e293b',
            }}
          >
            {/* Slide header */}
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
              {currentSlide.keywords && currentSlide.keywords.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {currentSlide.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Slide content - positioned layout */}
            <div 
              className="relative w-full"
              style={{ paddingBottom: '56.25%' }} // 16:9 aspect ratio
            >
              {(currentSlide.children || [])
                .filter(el => !el.isHidden)
                .map((element) => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: `${element.position?.x || 0}%`,
                      top: `${element.position?.y || 0}%`,
                      width: element.position?.width ? `${element.position.width}%` : 'auto',
                      height: element.position?.height ? `${element.position.height}%` : 'auto',
                    }}
                  >
                    <ElementRenderer element={element} />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-center py-12">
            Select a slide to view
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setSelectedSlide(Math.max(0, selectedSlideIndex - 1))}
            disabled={selectedSlideIndex === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            ← Previous
          </button>
          <span className="text-slate-400 self-center">
            {selectedSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={() => setSelectedSlide(Math.min(slides.length - 1, selectedSlideIndex + 1))}
            disabled={selectedSlideIndex === slides.length - 1}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  )
}


