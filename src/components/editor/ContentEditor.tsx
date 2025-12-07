import { useState } from 'react'
import { useSemanticStore } from '../../hooks/useSemanticStore'
import type { SemanticNode, SemanticTextContent, SemanticQuizContent } from '../../lib/semantic/schema'
import { getNodeLabel } from '../../lib/semantic/schema'
import QuizEditor from './QuizEditor'
import MediaManager from './MediaManager'

interface ContentEditorProps {
  slideIndex: number
}

// Helper to find a node by ID in the tree
function findNodeById(nodes: SemanticNode[], id: string): SemanticNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export default function ContentEditor({ slideIndex }: ContentEditorProps) {
  const { getCurrentSlide, updateSlideTitle, selectedElementId, setSelectedElement } = useSemanticStore()
  const [editingTitle, setEditingTitle] = useState(false)
  
  const slide = getCurrentSlide()
  
  if (!slide) {
    return (
      <div className="text-slate-400 text-center py-12">
        Select a slide to edit
      </div>
    )
  }
  
  // Get all content nodes from the slide's children
  const contentNodes = slide.children || []
  
  const selectedElement = selectedElementId 
    ? findNodeById(contentNodes, selectedElementId)
    : null
  
  return (
    <div className="space-y-6">
      {/* Slide Title */}
      <div className="bg-slate-800 rounded-xl p-4">
        <label className="text-sm text-slate-400 mb-2 block">Slide Title</label>
        {editingTitle ? (
          <input
            type="text"
            value={slide.title}
            onChange={(e) => updateSlideTitle(slideIndex, e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <h2 
            onClick={() => setEditingTitle(true)}
            className="text-xl font-semibold cursor-pointer hover:text-blue-400 transition-colors"
          >
            {slide.title}
            <span className="ml-2 text-xs text-slate-500">(click to edit)</span>
          </h2>
        )}
      </div>
      
      {/* Content nodes list */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Content ({contentNodes.length})
        </h3>
        
        <div className="space-y-2">
          {contentNodes.map((node) => (
            <ElementCard
              key={node.id}
              element={node}
              isSelected={node.id === selectedElementId}
              onClick={() => setSelectedElement(node.id === selectedElementId ? null : node.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Element editor */}
      {selectedElement && (
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">
              Edit: {selectedElement.contentType || (selectedElement.headingLevel ? `H${selectedElement.headingLevel}` : 'Content')}
            </h3>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <ElementEditor 
            element={selectedElement} 
            slideIndex={slideIndex}
          />
        </div>
      )}
      
      {/* Media manager */}
      <MediaManager slideIndex={slideIndex} />
    </div>
  )
}

interface ElementCardProps {
  element: SemanticNode
  isSelected: boolean
  onClick: () => void
}

function ElementCard({ element, isSelected, onClick }: ElementCardProps) {
  const getTypeIcon = () => {
    // For heading nodes (H3-H5)
    if (element.headingLevel && element.headingLevel >= 3) {
      return `H${element.headingLevel}`
    }
    
    // For content nodes
    switch (element.contentType) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'video': return '🎬'
      case 'audio': return '🔊'
      case 'link': return '🔗'
      case 'table': return '📊'
      case 'multichoice':
      case 'singlechoice':
      case 'summary':
      case 'truefalse':
      case 'blanks':
        return '❓'
      case 'navigation': return '➡️'
      default: return '◆'
    }
  }
  
  const getPreview = () => {
    // For heading nodes, use title
    if (element.headingLevel && element.title) {
      return element.title
    }
    
    // For content nodes
    if (element.content?.type === 'text') {
      const text = (element.content as SemanticTextContent).plainText
      return text.substring(0, 50) + (text.length > 50 ? '...' : '')
    }
    if (element.content?.type === 'quiz') {
      return `${(element.content as SemanticQuizContent).quizType} quiz`
    }
    return getNodeLabel(element)
  }
  
  const typeLabel = element.headingLevel 
    ? `Heading ${element.headingLevel}` 
    : element.contentType || 'content'
    
  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{getTypeIcon()}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{typeLabel}</p>
          <p className="text-xs text-slate-400 truncate">{getPreview()}</p>
        </div>
        {element.isButton && (
          <span className="px-2 py-0.5 bg-slate-600 rounded text-xs">Button</span>
        )}
        {element.isHidden && (
          <span className="px-2 py-0.5 bg-slate-600 rounded text-xs">Hidden</span>
        )}
      </div>
    </div>
  )
}

interface ElementEditorProps {
  element: SemanticNode
  slideIndex: number
}

function ElementEditor({ element, slideIndex }: ElementEditorProps) {
  const { updateElementContent } = useSemanticStore()
  
  // For heading nodes, show title editor
  if (element.headingLevel && element.title !== undefined) {
    return (
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Heading Title</label>
        <input
          type="text"
          value={element.title}
          onChange={(e) => updateElementContent(slideIndex, element.id, { title: e.target.value } as unknown as Partial<SemanticNode['content']>)}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
    )
  }
  
  // For text content nodes
  if (element.content?.type === 'text') {
    const textContent = element.content as SemanticTextContent
    
    return (
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Content (Markdown)</label>
        <textarea
          value={textContent.markdown}
          onChange={(e) => updateElementContent(slideIndex, element.id, { 
            markdown: e.target.value,
            plainText: e.target.value.replace(/[#*_~`\[\]()]/g, '').replace(/\n+/g, ' ').trim(),
          })}
          rows={6}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
        />
      </div>
    )
  }
  
  // For quiz content
  if (element.content?.type === 'quiz') {
    return <QuizEditor element={element} slideIndex={slideIndex} />
  }
  
  // For other types, show JSON editor
  return (
    <div>
      <label className="text-sm text-slate-400 mb-2 block">Raw Content (JSON)</label>
      <pre className="p-3 bg-slate-700 rounded-lg text-xs overflow-auto max-h-64">
        {JSON.stringify(element.content || element, null, 2)}
      </pre>
    </div>
  )
}

