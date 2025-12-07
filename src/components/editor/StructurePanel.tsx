import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSemanticStore } from '../../hooks/useSemanticStore'
import type { SemanticNode } from '../../lib/semantic/schema'

interface SortableSlideProps {
  slide: SemanticNode
  slideIndex: number
  isSelected: boolean
  onClick: () => void
}

function SortableSlide({ slide, slideIndex, isSelected, onClick }: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  const childCount = slide.children?.length || 0
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-600' : 'hover:bg-slate-700'}
        ${isDragging ? 'shadow-lg' : ''}
      `}
      onClick={onClick}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{slide.title}</p>
        <p className="text-xs text-slate-400">
          {childCount} item{childCount !== 1 ? 's' : ''}
        </p>
      </div>
      <span className="text-xs text-slate-500">{slideIndex + 1}</span>
    </div>
  )
}

export default function StructurePanel() {
  const { semanticJson, selectedSlideIndex, setSelectedSlide, moveSlide, getSlides } = useSemanticStore()
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  if (!semanticJson) {
    return <div className="p-4 text-slate-400">No content loaded</div>
  }
  
  const slides = getSlides()
  
  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const activeId = String(active.id)
      const overId = String(over.id)
      const oldIndex = slides.findIndex(s => s.id === activeId)
      const newIndex = slides.findIndex(s => s.id === overId)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        moveSlide(oldIndex, newIndex)
      }
    }
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Structure</h3>
        <span className="text-xs text-slate-500">{slides.length} slides</span>
      </div>
      
      {/* Sections (H1 nodes) */}
      {semanticJson.structure.children.filter((s: SemanticNode) => s.headingLevel === 1).map((section: SemanticNode) => {
        // Get H2 (slide) children
        const sectionSlides = (section.children || []).filter((c: SemanticNode) => c.headingLevel === 2)
        
        return (
          <div key={section.id} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-300">{section.title}</span>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionSlides.map((s: SemanticNode) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 pl-4">
                  {sectionSlides.map((slide: SemanticNode, idx: number) => (
                    <SortableSlide
                      key={slide.id}
                      slide={slide}
                      slideIndex={idx}
                      isSelected={idx === selectedSlideIndex}
                      onClick={() => setSelectedSlide(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        )
      })}
      
      {/* Metadata section */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-400 mb-3">Package Info</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Title</span>
            <span className="text-slate-300">{semanticJson.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Language</span>
            <span className="text-slate-300">{semanticJson.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <span className="text-slate-300 text-xs">{semanticJson.contentType}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

