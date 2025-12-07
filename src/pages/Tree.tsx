import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSemanticStore } from '../hooks/useSemanticStore'
import SemanticTreeView, { TreeNode } from '../components/editor/SemanticTreeView'
import SemanticAnnotationPanel from '../components/editor/SemanticAnnotationPanel'
import ElementContentPreview from '../components/editor/ElementContentPreview'
import type { SemanticNode, SemanticTextContent, SectionType } from '../lib/semantic/schema'

export default function Tree() {
  const navigate = useNavigate()
  const { package: pkg, semanticJson, getNodeAnnotations } = useSemanticStore()
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const treeContainerRef = useRef<HTMLDivElement>(null)
  
  // Function to return focus to tree for keyboard navigation
  const returnFocusToTree = () => {
    setIsEditingContent(false)
    // Find and focus the tree view container
    const treeView = treeContainerRef.current?.querySelector('[role="tree"]') as HTMLElement
    if (treeView) {
      treeView.focus()
    }
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-slate-400 mb-4">No package loaded</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Upload a package
        </button>
      </div>
    )
  }

  // Called when navigating with arrow keys - just updates selection, no editing
  const handleNodeFocus = (node: TreeNode) => {
    const annotations = getNodeAnnotations(node.id)
    const enrichedNode: TreeNode = {
      ...node,
      semanticTags: annotations?.tags || node.semanticTags || [],
      semanticNote: annotations?.note || node.semanticNote,
    }
    setSelectedNode(enrichedNode)
    // Don't auto-enable editing - user must press Enter
    setIsEditingContent(false)
  }

  // Called when pressing Enter - opens editing on right panel
  const handleNodeEdit = (node: TreeNode) => {
    const annotations = getNodeAnnotations(node.id)
    const enrichedNode: TreeNode = {
      ...node,
      semanticTags: annotations?.tags || node.semanticTags || [],
      semanticNote: annotations?.note || node.semanticNote,
    }
    setSelectedNode(enrichedNode)
    setIsEditingContent(true)
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(semanticJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'semantic.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{pkg.metadata.title || 'Untitled Package'}</h1>
            <p className="text-sm text-slate-400">Semantic Tree View</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/viewer')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              View
            </button>
            <button
              onClick={() => navigate('/editor')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleExportJson}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              New
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Tree view panel */}
        <aside className="w-96 border-r border-slate-700 bg-slate-800/30 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-medium text-sm text-slate-300">Content Structure</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <kbd className="kbd">Enter</kbd> select • <kbd className="kbd">⇧Enter</kbd> edit title
            </p>
          </div>
          <div ref={treeContainerRef} className="flex-1 overflow-auto">
            <SemanticTreeView 
              onNodeFocus={handleNodeFocus}
              onNodeEdit={handleNodeEdit}
            />
          </div>
        </aside>

        {/* Content Editor panel (right side) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-auto p-6">
            <ContentEditorPanel 
              node={selectedNode} 
              isEditing={isEditingContent}
              onSaveAndReturn={returnFocusToTree}
            />
          </div>

          {/* Collapsible Semantic Annotations Footer */}
          <SemanticAnnotationsFooter selectedNode={selectedNode} />
        </div>
      </main>
    </div>
  )
}

// Content Editor Panel - shows immediately next to tree
interface ContentEditorPanelProps {
  node: TreeNode | null
  isEditing: boolean
  onSaveAndReturn: () => void  // Called when Escape is pressed - saves and returns focus to tree
}

const SECTION_TYPES: SectionType[] = [
  'task', 'note', 'optional', 'summary', 'intro', 'next-steps', 'deep-dive', 'generic'
]

function ContentEditorPanel({ node, isEditing, onSaveAndReturn }: ContentEditorPanelProps) {
  const { updateElementContent, findNodeLocation, updateNodeSemantics } = useSemanticStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editValue, setEditValue] = useState('')
  
  // Get semantic node data
  const semanticNode = node?.data as SemanticNode | null
  const isTextElement = semanticNode?.content?.type === 'text'
  const isHeadingNode = semanticNode?.headingLevel !== undefined
  
  // Get section type from semantic node
  const currentSectionType = semanticNode?.sectionType
  
  // Initialize edit value when node changes or editing starts
  useEffect(() => {
    if (isEditing && semanticNode) {
      if (isTextElement) {
        const textContent = semanticNode.content as SemanticTextContent
        setEditValue(textContent.markdown || '')
      } else if (isHeadingNode) {
        setEditValue(semanticNode.title || '')
      }
      // Focus the textarea after a small delay
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isEditing, isTextElement, isHeadingNode, semanticNode, node?.id])
  
  // Save changes to the store and return focus to tree
  const handleSaveAndReturn = () => {
    if (semanticNode && (isTextElement || isHeadingNode)) {
      const loc = findNodeLocation(semanticNode.id)
      if (loc) {
        // Find the slide index (get the first ancestor that is H2/slide level)
        const slideAncestor = loc.ancestors.find(a => a.headingLevel === 2)
        const slideIndex = slideAncestor ? 0 : 0 // For now, use 0 as fallback
        
        if (isTextElement) {
          // Convert to plain text by stripping markdown syntax
          const plainText = editValue
            .replace(/^#{1,6}\s+/gm, '')  // Remove headings
            .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
            .replace(/\*(.+?)\*/g, '$1')  // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Extract link text
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')  // Extract image alt
            .replace(/`([^`]+)`/g, '$1')  // Remove inline code
            .replace(/^[-*]\s+/gm, '')  // Remove list markers
            .replace(/^\d+\.\s+/gm, '')  // Remove numbered list markers
            .replace(/^>\s+/gm, '')  // Remove blockquote markers
            .trim()
          
          updateElementContent(slideIndex, semanticNode.id, {
            markdown: editValue,
            plainText
          })
        }
      }
    }
    onSaveAndReturn()
  }

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">Select a node to edit</p>
        <p className="text-xs text-slate-500 mt-1">Press Enter on a tree item</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
        <span className="text-2xl">{getNodeIcon(node.type)}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{node.label}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 capitalize">{node.type}</span>
            {node.semanticTags && node.semanticTags.length > 0 && (
              <>
                {node.semanticTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section Type Editor for sections and slides */}
      {(node.type === 'section' || node.type === 'slide') && (
        <div className="bg-slate-800 rounded-lg p-4">
          <label className="text-sm text-slate-400 mb-2 block">Section Type</label>
          <div className="flex flex-wrap gap-2">
            {SECTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => updateNodeSemantics(node.id, node.type, { sectionType: type })}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  currentSectionType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {currentSectionType && (
            <button
              onClick={() => updateNodeSemantics(node.id, node.type, { sectionType: 'generic' })}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear section type
            </button>
          )}
        </div>
      )}

      {/* Content Editor for text elements */}
      {isTextElement && isEditing && (
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">Edit Markdown Content</label>
            <button
              onClick={handleSaveAndReturn}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Save & Close
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                handleSaveAndReturn()
              } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSaveAndReturn()
              }
            }}
            className="w-full h-48 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none resize-y"
            placeholder="Enter Markdown content..."
          />
          <p className="text-xs text-slate-500">
            <kbd className="kbd">Esc</kbd> or <kbd className="kbd">Ctrl+S</kbd> to save and return to tree navigation
          </p>
        </div>
      )}

      {/* Content Preview - show when not editing or for non-text elements */}
      {semanticNode && (!isEditing || !isTextElement) && (
        <div className="relative group">
          <ElementContentPreview element={semanticNode} />
          {isTextElement && (
            <button
              onClick={() => {/* Already in editing mode via Enter */}}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700/80 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Click to edit
            </button>
          )}
        </div>
      )}

      {/* Semantic note if present */}
      {node.semanticNote && (
        <div className="p-3 bg-slate-700/50 rounded-lg border-l-4 border-blue-500">
          <p className="text-sm text-slate-300">{node.semanticNote}</p>
        </div>
      )}

      {/* Children list (collapsible if many) */}
      {node.children && node.children.length > 0 && (
        <details className="bg-slate-800/50 rounded-lg" open={node.children.length <= 5}>
          <summary className="p-3 cursor-pointer text-slate-300 hover:text-white font-medium">
            Children ({node.children.length})
          </summary>
          <div className="p-3 pt-0 space-y-1">
            {node.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-sm"
              >
                <span>{getNodeIcon(child.type)}</span>
                <span className="truncate flex-1">{child.label}</span>
                <span className="text-xs text-slate-500 capitalize">{child.type}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Raw data - collapsed, click to reveal */}
      {node.data !== null && node.data !== undefined && (
        <details className="bg-slate-800/30 rounded-lg">
          <summary className="p-3 cursor-pointer text-slate-500 hover:text-slate-300 text-sm">
            Show Raw Data
          </summary>
          <pre className="p-3 pt-0 text-xs overflow-auto max-h-64 text-slate-400 font-mono">
            {JSON.stringify(node.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

// Collapsible Semantic Annotations Footer
function SemanticAnnotationsFooter({ selectedNode }: { selectedNode: TreeNode | null }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-t border-slate-700 bg-slate-800/50">
      {/* Footer Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▲
          </span>
          <span className="font-medium text-sm text-slate-300">Semantic Annotations</span>
          {selectedNode && (
            <span className="text-xs text-slate-500">
              ({selectedNode.semanticTags?.length || 0} tags)
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="max-h-80 overflow-auto border-t border-slate-700">
          <SemanticAnnotationPanel selectedNode={selectedNode} />
        </div>
      )}
    </div>
  )
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

