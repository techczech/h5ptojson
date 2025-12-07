import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useSemanticStore } from '../../hooks/useSemanticStore'
import type {
  SemanticNode,
  SemanticTextContent,
  SemanticRole,
  HeadingLevel,
} from '../../lib/semantic/schema'
import { getNodeLabel } from '../../lib/semantic/schema'

// Get label for a node for editing purposes
function getEditableLabel(node: TreeNode): string {
  const semanticNode = node.data as SemanticNode | null
  if (!semanticNode) return node.label
  
  // For heading nodes, return the title
  if (semanticNode.headingLevel && semanticNode.title) {
    return semanticNode.title
  }
  
  // For content nodes, return plain text if available
  if (semanticNode.content?.type === 'text') {
    return (semanticNode.content as SemanticTextContent).plainText
  }
  
  return node.label
}

// Tree node types
type TreeNodeType = 'package' | 'section' | 'slide' | 'element'

interface TreeNode {
  id: string
  type: TreeNodeType
  label: string
  children?: TreeNode[]
  data: unknown
  semanticTags?: string[]
  semanticNote?: string
  depth: number
}

interface SemanticTreeViewProps {
  onNodeSelect?: (node: TreeNode) => void  // Legacy - called on both focus and edit
  onNodeFocus?: (node: TreeNode) => void   // Called when navigating to a node (arrow keys, click)
  onNodeEdit?: (node: TreeNode) => void    // Called when pressing Enter to edit
}

export default function SemanticTreeView({ onNodeSelect, onNodeFocus, onNodeEdit }: SemanticTreeViewProps) {
  const { 
    semanticJson, 
    nestElementUnder, 
    unnestElement,
    setElementSemanticTag,
    addNewElement,
    moveNodeUp,
    moveNodeDown,
    addNewSection,
    updatePackageTitle,
    updateSectionTitle,
    updateElementLabel,
    deleteNode,
    undoDelete,
  } = useSemanticStore()
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build tree node recursively from SemanticNode
  const buildTreeNode = useCallback((semanticNode: SemanticNode, depth: number): TreeNode => {
    // Determine the tree node type based on heading level
    let nodeType: TreeNodeType = 'element'
    if (semanticNode.headingLevel === 1) {
      nodeType = 'section'
    } else if (semanticNode.headingLevel === 2) {
      nodeType = 'slide'
    }
    
    // Build semantic tags array
    const semanticTags: string[] = []
    if (semanticNode.sectionType) {
      semanticTags.push(semanticNode.sectionType)
    }
    if (semanticNode.semanticRole && semanticNode.semanticRole !== 'heading') {
      semanticTags.push(semanticNode.semanticRole)
    }
    if (semanticNode.headingLevel && semanticNode.headingLevel >= 3) {
      semanticTags.push(`H${semanticNode.headingLevel}`)
    }
    
    const node: TreeNode = {
      id: semanticNode.id,
      type: nodeType,
      label: getNodeLabel(semanticNode),
      data: semanticNode,
      depth,
      semanticTags,
    }
    
    if (semanticNode.children?.length) {
      node.children = semanticNode.children.map(child => buildTreeNode(child, depth + 1))
    }
    
    return node
  }, [])

  // Build tree structure from semantic JSON
  const tree = useMemo((): TreeNode | null => {
    if (!semanticJson) return null
    
    // Build from the structure's children (H1 sections)
    const children = semanticJson.structure.children.map(node => buildTreeNode(node, 1))
    
    return {
      id: 'root',
      type: 'package',
      label: semanticJson.title,
      data: null,
      depth: 0,
      children,
    }
  }, [semanticJson, buildTreeNode])

  // Flatten visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => {
    if (!tree) return []
    const nodes: TreeNode[] = []
    const traverse = (node: TreeNode) => {
      nodes.push(node)
      if (expandedNodes.has(node.id) && node.children) {
        node.children.forEach(traverse)
      }
    }
    traverse(tree)
    return nodes
  }, [tree, expandedNodes])

  // Initialize focus on first node
  useEffect(() => {
    if (!focusedNodeId && visibleNodes.length > 0) {
      setFocusedNodeId(visibleNodes[0].id)
    }
  }, [visibleNodes, focusedNodeId])

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const selectNode = useCallback((node: TreeNode) => {
    setFocusedNodeId(node.id)
    // Call onNodeFocus if available, otherwise fall back to onNodeSelect for backward compatibility
    if (onNodeFocus) {
      onNodeFocus(node)
    } else {
      onNodeSelect?.(node)
    }
  }, [onNodeFocus, onNodeSelect])

  // Save edited title based on node type
  const saveNodeTitle = useCallback((node: TreeNode, newTitle: string) => {
    if (!newTitle.trim()) {
      // Restore focus even if empty
      setEditingNodeId(null)
      setTimeout(() => containerRef.current?.focus(), 0)
      return
    }
    
    switch (node.type) {
      case 'package':
        updatePackageTitle(newTitle)
        break
      case 'section':
      case 'slide':
        // Both sections (H1) and slides (H2) update via updateSectionTitle
        updateSectionTitle(node.id, newTitle)
        break
      case 'element':
        // For content nodes, update the label/text
        updateElementLabel(node.id, newTitle)
        break
    }
    setEditingNodeId(null)
    // Restore focus to container for keyboard navigation
    setTimeout(() => containerRef.current?.focus(), 0)
  }, [updatePackageTitle, updateSectionTitle, updateElementLabel])

  const startEditing = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingNodeId(null)
    // Restore focus to container for keyboard navigation
    setTimeout(() => containerRef.current?.focus(), 0)
  }, [])

  // Get focused node and its index
  const focusedIndex = visibleNodes.findIndex(n => n.id === focusedNodeId)
  const focusedNode = focusedIndex >= 0 ? visibleNodes[focusedIndex] : null

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedNode) return

    // Skip if in input/textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    const hasModifier = e.ctrlKey || e.metaKey

    // Handle arrow keys - check for modifiers first
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (hasModifier && e.shiftKey) {
        // Ctrl+Shift+Up: Move node up in list (works for elements, slides, sections)
        const nodeType = focusedNode.type as 'element' | 'slide' | 'section'
        if (nodeType === 'element' || nodeType === 'slide' || nodeType === 'section') {
          moveNodeUp(focusedNode.id, nodeType)
        }
      } else if (!hasModifier && !e.shiftKey) {
        // Plain Up: Navigate to previous node
        if (focusedIndex > 0) {
          selectNode(visibleNodes[focusedIndex - 1])
        }
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (hasModifier && e.shiftKey) {
        // Ctrl+Shift+Down: Move node down in list (works for elements, slides, sections)
        const nodeType = focusedNode.type as 'element' | 'slide' | 'section'
        if (nodeType === 'element' || nodeType === 'slide' || nodeType === 'section') {
          moveNodeDown(focusedNode.id, nodeType)
        }
      } else if (!hasModifier && !e.shiftKey) {
        // Plain Down: Navigate to next node
        if (focusedIndex < visibleNodes.length - 1) {
          selectNode(visibleNodes[focusedIndex + 1])
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        if (focusedNode.children?.length && !expandedNodes.has(focusedNode.id)) {
          toggleExpand(focusedNode.id)
        } else if (focusedNode.children?.length && expandedNodes.has(focusedNode.id)) {
          // Move to first child
          selectNode(focusedNode.children[0])
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        if (expandedNodes.has(focusedNode.id) && focusedNode.children?.length) {
          toggleExpand(focusedNode.id)
        } else {
          // Move to parent
          const parent = findParentNode(tree, focusedNode.id)
          if (parent) selectNode(parent)
        }
        break

      // Nesting with Tab
      case 'Tab':
        if (focusedNode.type === 'element') {
          e.preventDefault()
          if (e.shiftKey) {
            // Unnest (move up a level)
            unnestElement(focusedNode.id)
          } else {
            // Nest under previous sibling
            const parent = findParentNode(tree, focusedNode.id)
            if (parent?.children) {
              const idx = parent.children.findIndex(c => c.id === focusedNode.id)
              if (idx > 0) {
                const prevSibling = parent.children[idx - 1]
                nestElementUnder(focusedNode.id, prevSibling.id)
                // Expand the new parent
                setExpandedNodes(prev => new Set([...prev, prevSibling.id]))
              }
            }
          }
        }
        break

      // Move node up/down in list with PageUp/PageDown
      case 'PageUp':
        e.preventDefault()
        {
          const nodeType = focusedNode.type as 'element' | 'slide' | 'section'
          if (nodeType === 'element' || nodeType === 'slide' || nodeType === 'section') {
            moveNodeUp(focusedNode.id, nodeType)
          }
        }
        break

      case 'PageDown':
        e.preventDefault()
        {
          const nodeType = focusedNode.type as 'element' | 'slide' | 'section'
          if (nodeType === 'element' || nodeType === 'slide' || nodeType === 'section') {
            moveNodeDown(focusedNode.id, nodeType)
          }
        }
        break

      // Expand/collapse all
      case 'Home':
        e.preventDefault()
        if (visibleNodes.length > 0) {
          selectNode(visibleNodes[0])
        }
        break

      case 'End':
        e.preventDefault()
        if (visibleNodes.length > 0) {
          selectNode(visibleNodes[visibleNodes.length - 1])
        }
        break

      // Enter: focus content editor on right / Shift+Enter: inline edit title
      case 'Enter':
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Enter: Start inline editing of title in tree
          startEditing(focusedNode.id)
        } else {
          // Enter: Focus the content editor on the right side
          if (onNodeEdit) {
            onNodeEdit(focusedNode)
          } else {
            onNodeSelect?.(focusedNode)
          }
        }
        break

      // Space to toggle expand/collapse
      case ' ':
        e.preventDefault()
        if (focusedNode.children?.length) {
          toggleExpand(focusedNode.id)
        }
        break

      // 'A' to add new element below current position
      case 'a':
      case 'A':
        e.preventDefault()
        {
          // Find the slide to add to and the element to add after
          let slideId: string | null = null
          let afterElementId: string | undefined = undefined
          
          if (focusedNode.type === 'slide') {
            slideId = focusedNode.id
          } else if (focusedNode.type === 'element') {
            afterElementId = focusedNode.id
            // Find slide ancestor
            let current: TreeNode | null = focusedNode
            while (current && current.type !== 'slide') {
              current = findParentNode(tree, current.id)
            }
            if (current) slideId = current.id
          } else if (focusedNode.type === 'section') {
            // If on a section, add to first slide if exists
            if (focusedNode.children?.[0]?.type === 'slide') {
              slideId = focusedNode.children[0].id
            }
          }
          
          if (slideId && addNewElement) {
            const newId = addNewElement(slideId, afterElementId)
            if (newId) {
              setTimeout(() => setFocusedNodeId(newId), 50)
            }
          }
        }
        break
      
      // 'S' to add new section
      case 's':
      case 'S':
        if (e.shiftKey) {
          e.preventDefault()
          // Find current section
          let currentSectionId: string | null = null
          if (focusedNode.type === 'section') {
            currentSectionId = focusedNode.id
          } else {
            // Find section ancestor
            let current: TreeNode | null = focusedNode
            while (current && current.type !== 'section') {
              current = findParentNode(tree, current.id)
            }
            if (current) currentSectionId = current.id
          }
          const newId = addNewSection(currentSectionId || undefined)
          if (newId) {
            setExpandedNodes(prev => new Set([...prev, newId]))
          }
        }
        break

      // Delete node with Delete or Backspace
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        {
          // Don't delete the root package
          if (focusedNode.type === 'element' || focusedNode.type === 'slide' || focusedNode.type === 'section') {
            // Move focus to previous node before deleting
            if (focusedIndex > 0) {
              setFocusedNodeId(visibleNodes[focusedIndex - 1].id)
            }
            deleteNode(focusedNode.id, focusedNode.type)
          }
        }
        break

      // Ctrl+Z to undo delete
      case 'z':
      case 'Z':
        if (hasModifier && !e.shiftKey) {
          e.preventDefault()
          undoDelete()
        }
        break

      // Semantic tag shortcuts (for element nodes only)
      default:
        if (focusedNode.type === 'element') {
          const key = e.key.toLowerCase()
          const tagMap: Record<string, SemanticRole> = {
            'h': 'heading',
            't': 'text',
            'l': 'label',
            'd': 'description',
            'p': 'popup',
            'c': 'caption',
          }
          if (tagMap[key]) {
            e.preventDefault()
            const tag = tagMap[key]
            // Calculate heading level based on tree depth (H3-H5 for content)
            const level = tag === 'heading' 
              ? Math.min(5, Math.max(3, focusedNode.depth)) as HeadingLevel
              : undefined
            setElementSemanticTag(focusedNode.id, tag, level)
          }
        }
    }
  }, [focusedNode, focusedIndex, visibleNodes, expandedNodes, tree, toggleExpand, selectNode, 
      onNodeSelect, onNodeEdit, unnestElement, nestElementUnder, moveNodeUp, moveNodeDown, setElementSemanticTag, 
      addNewSection, addNewElement, setFocusedNodeId, startEditing, deleteNode, undoDelete])

  if (!tree) {
    return <div className="p-4 text-slate-400">No content loaded</div>
  }

  return (
    <div 
      ref={containerRef}
      className="h-full flex flex-col bg-slate-900"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
      aria-label="Content structure"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-700 bg-slate-800/50">
        <span className="text-xs text-slate-400">
          Press <kbd className="kbd">A</kbd> to add element
        </span>
        <span className="text-xs text-slate-500 ml-auto">
          {visibleNodes.length} items
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto p-1">
        {visibleNodes.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            isExpanded={expandedNodes.has(node.id)}
            isFocused={node.id === focusedNodeId}
            isEditing={node.id === editingNodeId}
            onToggle={() => toggleExpand(node.id)}
            onClick={() => selectNode(node)}
            onSaveTitle={(newTitle) => saveNodeTitle(node, newTitle)}
            onCancelEdit={cancelEditing}
          />
        ))}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="p-2 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-400">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span><kbd className="kbd">↑↓</kbd> Navigate</span>
          <span><kbd className="kbd">←→</kbd> Collapse/Expand</span>
          <span><kbd className="kbd">Tab</kbd> Nest under prev</span>
          <span><kbd className="kbd">⇧Tab</kbd> Unnest</span>
          <span><kbd className="kbd">⌃⇧↑↓</kbd> Move up/down</span>
          <span><kbd className="kbd">A</kbd> Add element</span>
          <span><kbd className="kbd">⇧S</kbd> Add section</span>
          <span><kbd className="kbd">Enter</kbd> Select / <kbd className="kbd">⇧Enter</kbd> Edit</span>
          <span><kbd className="kbd">Del</kbd> Delete</span>
          <span><kbd className="kbd">⌃Z</kbd> Undo delete</span>
        </div>
        <div className="mt-1 pt-1 border-t border-slate-700">
          <span className="text-slate-500">Tags: </span>
          <kbd className="kbd">h</kbd>=heading
          <kbd className="kbd ml-1">t</kbd>=text
          <kbd className="kbd ml-1">l</kbd>=label
          <kbd className="kbd ml-1">d</kbd>=desc
          <kbd className="kbd ml-1">p</kbd>=popup
          <kbd className="kbd ml-1">c</kbd>=caption
        </div>
      </div>
    </div>
  )
}

// Individual tree row component
interface TreeRowProps {
  node: TreeNode
  isExpanded: boolean
  isFocused: boolean
  isEditing: boolean
  onToggle: () => void
  onClick: () => void
  onSaveTitle: (newTitle: string) => void
  onCancelEdit: () => void
}

function TreeRow({ node, isExpanded, isFocused, isEditing, onToggle, onClick, onSaveTitle, onCancelEdit }: TreeRowProps) {
  const hasChildren = node.children && node.children.length > 0
  const indent = node.depth * 16
  const inputRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState('')
  
  const semanticNode = node.data as SemanticNode | null
  const semanticRole = semanticNode?.semanticRole
  const headingLevel = semanticNode?.headingLevel
  const contentType = semanticNode?.contentType

  // Check if this node is editable (heading nodes with titles, or text content nodes)
  const isEditable = node.type !== 'element' || 
    (semanticNode?.headingLevel !== undefined) || 
    (semanticNode?.content?.type === 'text')

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      setEditValue(getEditableLabel(node))
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing, node])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      onSaveTitle(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancelEdit()
    }
  }

  const handleBlur = () => {
    // Save on blur if value changed
    if (editValue.trim() && editValue !== getEditableLabel(node)) {
      onSaveTitle(editValue)
    } else {
      onCancelEdit()
    }
  }

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={node.depth + 1}
      aria-selected={isFocused}
      className={`
        flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none
        transition-colors duration-75
        ${isFocused 
          ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-inset' 
          : 'hover:bg-slate-700/50 text-slate-200'
        }
      `}
      style={{ paddingLeft: `${indent + 8}px` }}
      onClick={onClick}
      onDoubleClick={onToggle}
    >
      {/* Expand/collapse indicator */}
      <span 
        className="w-4 h-4 flex items-center justify-center text-slate-400"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {hasChildren ? (isExpanded ? '▼' : '▶') : '·'}
      </span>

      {/* Type icon */}
      <span className="text-sm w-5 text-center" title={node.type}>
        {getNodeIcon(node.type, contentType, headingLevel)}
      </span>

      {/* Label - either input or text */}
      {isEditing && isEditable ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          aria-label="Edit title"
          className="flex-1 min-w-0 px-1 py-0 text-sm bg-slate-800 border border-blue-400 rounded outline-none text-white"
        />
      ) : (
        <span className="flex-1 truncate text-sm">{node.label}</span>
      )}

      {/* Semantic role badge for content nodes */}
      {semanticRole && !isEditing && node.type === 'element' && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getSemanticRoleColor(semanticRole)}`}>
          {semanticRole === 'heading' && headingLevel ? `H${headingLevel}` : semanticRole.toUpperCase()}
        </span>
      )}

      {/* Heading level badge for H3+ nodes */}
      {headingLevel && headingLevel >= 3 && !semanticRole && !isEditing && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-500/80 text-white">
          H{headingLevel}
        </span>
      )}

      {/* Section type tags */}
      {!isEditing && node.semanticTags && node.semanticTags.length > 0 && 
       !node.semanticTags.some(t => t.startsWith('H')) && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600/50 text-slate-300">
          {node.semanticTags[0]}
        </span>
      )}
    </div>
  )
}

// Helper functions
function getNodeIcon(type: TreeNodeType, contentType?: string, headingLevel?: number): string {
  if (type === 'package') return '📦'
  if (type === 'section') return 'H1'  // H1 heading
  if (type === 'slide') return 'H2'    // H2 heading
  if (type === 'element') {
    // Check if it's a sub-heading (H3-H5)
    if (headingLevel && headingLevel >= 3) {
      return `H${headingLevel}`
    }
    // Content type icons
    if (contentType === 'image') return '🖼'
    if (contentType === 'video') return '🎬'
    if (contentType === 'text') return '📝'
    if (contentType === 'audio') return '🔊'
    if (contentType === 'link') return '🔗'
    if (contentType?.includes('choice') || contentType === 'blanks' || contentType === 'truefalse') return '❓'
    return '◆'
  }
  return '•'
}

function getSemanticRoleColor(role: SemanticRole): string {
  const colors: Record<SemanticRole, string> = {
    heading: 'bg-purple-500/80 text-white',
    text: 'bg-slate-500/80 text-white',
    label: 'bg-blue-500/80 text-white',
    description: 'bg-green-500/80 text-white',
    popup: 'bg-orange-500/80 text-white',
    caption: 'bg-cyan-500/80 text-white',
    content: 'bg-indigo-500/80 text-white',
  }
  return colors[role] || 'bg-slate-600 text-slate-300'
}

function findParentNode(root: TreeNode | null, childId: string): TreeNode | null {
  if (!root?.children) return null
  for (const child of root.children) {
    if (child.id === childId) return root
    const found = findParentNode(child, childId)
    if (found) return found
  }
  return null
}

export type { TreeNode, TreeNodeType }
