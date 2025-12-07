import { useState } from 'react'
import type { TreeNode } from './SemanticTreeView'
import type { SemanticNode, SectionType } from '../../lib/semantic/schema'
import { useSemanticStore } from '../../hooks/useSemanticStore'

interface SemanticAnnotationPanelProps {
  selectedNode: TreeNode | null
}

const SECTION_TYPES: SectionType[] = [
  'task',
  'note',
  'optional',
  'summary',
  'intro',
  'next-steps',
  'deep-dive',
  'generic',
]

const ELEMENT_SEMANTIC_TAGS = [
  'heading',
  'subheading',
  'body-text',
  'callout',
  'definition',
  'example',
  'quote',
  'instruction',
  'warning',
  'tip',
  'key-point',
  'reference',
]

export default function SemanticAnnotationPanel({ selectedNode }: SemanticAnnotationPanelProps) {
  const { updateNodeSemantics } = useSemanticStore()
  const [customTag, setCustomTag] = useState('')

  if (!selectedNode) {
    return (
      <div className="p-4 text-slate-400 text-center">
        <p className="text-sm">Select a node to add semantic annotations</p>
      </div>
    )
  }

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return
    updateNodeSemantics(selectedNode.id, selectedNode.type, {
      addTag: tag.trim(),
    })
    setCustomTag('')
  }

  const handleRemoveTag = (tag: string) => {
    updateNodeSemantics(selectedNode.id, selectedNode.type, {
      removeTag: tag,
    })
  }

  const handleSetSectionType = (sectionType: SectionType) => {
    updateNodeSemantics(selectedNode.id, selectedNode.type, {
      sectionType,
    })
  }

  const handleSetNote = (note: string) => {
    updateNodeSemantics(selectedNode.id, selectedNode.type, {
      note,
    })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{getNodeIcon(selectedNode.type)}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{selectedNode.label}</h3>
          <p className="text-xs text-slate-400 capitalize">{selectedNode.type}</p>
        </div>
      </div>

      {/* Section Type (for sections and slides) */}
      {(selectedNode.type === 'section' || selectedNode.type === 'slide') && (
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Section Type</label>
          <div className="flex flex-wrap gap-1">
            {SECTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSetSectionType(type)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedNode.semanticTags?.includes(type)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Semantic Tags */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Semantic Tags</label>
        
        {/* Current tags */}
        {selectedNode.semanticTags && selectedNode.semanticTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedNode.semanticTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested tags for elements */}
        {selectedNode.type === 'element' && (
          <div className="flex flex-wrap gap-1 mb-2">
            {ELEMENT_SEMANTIC_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddTag(tag)}
                disabled={selectedNode.semanticTags?.includes(tag)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  selectedNode.semanticTags?.includes(tag)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                + {tag}
              </button>
            ))}
          </div>
        )}

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag(customTag)}
            placeholder="Custom tag..."
            className="flex-1 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => handleAddTag(customTag)}
            disabled={!customTag.trim()}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Semantic Note */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Notes / Description</label>
        <textarea
          value={selectedNode.semanticNote || ''}
          onChange={(e) => handleSetNote(e.target.value)}
          placeholder="Add notes about this content..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded focus:border-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Node Details */}
      <div className="pt-4 border-t border-slate-700">
        <label className="text-sm text-slate-400 mb-2 block">Details</label>
        <NodeDetails node={selectedNode} />
      </div>
    </div>
  )
}

function NodeDetails({ node }: { node: TreeNode }) {
  const semanticNode = node.data as SemanticNode | null
  
  if (!semanticNode) {
    return null
  }
  
  if (node.type === 'section') {
    // H1 level node
    const childCount = semanticNode.children?.filter(c => c.headingLevel === 2).length || 0
    return (
      <div className="text-xs space-y-1 text-slate-400">
        <p>ID: <span className="text-slate-300 font-mono">{semanticNode.id}</span></p>
        <p>Heading: <span className="text-slate-300">H1</span></p>
        <p>Slides: <span className="text-slate-300">{childCount}</span></p>
      </div>
    )
  }

  if (node.type === 'slide') {
    // H2 level node
    const childCount = semanticNode.children?.length || 0
    return (
      <div className="text-xs space-y-1 text-slate-400">
        <p>ID: <span className="text-slate-300 font-mono">{semanticNode.id}</span></p>
        <p>Heading: <span className="text-slate-300">H2</span></p>
        <p>Content: <span className="text-slate-300">{childCount} items</span></p>
        {semanticNode.keywords && semanticNode.keywords.length > 0 && (
          <p>Keywords: <span className="text-slate-300">{semanticNode.keywords.join(', ')}</span></p>
        )}
      </div>
    )
  }

  if (node.type === 'element') {
    // Content node
    const typeLabel = semanticNode.headingLevel 
      ? `H${semanticNode.headingLevel}` 
      : semanticNode.contentType || 'content'
    return (
      <div className="text-xs space-y-1 text-slate-400">
        <p>ID: <span className="text-slate-300 font-mono">{semanticNode.id}</span></p>
        <p>Type: <span className="text-slate-300">{typeLabel}</span></p>
        {semanticNode.position && (
          <p>Position: <span className="text-slate-300">
            {semanticNode.position.x?.toFixed(1) || 0}%, {semanticNode.position.y?.toFixed(1) || 0}%
          </span></p>
        )}
        {semanticNode.isButton && <p className="text-yellow-400">Is a button</p>}
        {semanticNode.isHidden && <p className="text-orange-400">Is hidden</p>}
      </div>
    )
  }

  return null
}

function getNodeIcon(type: string): string {
  switch (type) {
    case 'package': return '📦'
    case 'section': return '📁'
    case 'slide': return '📄'
    case 'element': return '🔹'
    default: return '•'
  }
}

