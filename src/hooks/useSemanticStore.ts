import { create } from 'zustand'
import type { H5PPackage } from '../lib/h5p/types'
import type { 
  SemanticPackage, 
  SemanticNode, 
  SectionType, 
  SemanticRole,
  HeadingLevel,
  SemanticTextContent,
} from '../lib/semantic/schema'
import { transformToSemantic } from '../lib/semantic/transformer'
import { downloadSemanticJson, downloadZipBundle } from '../lib/storage'

// Semantic annotations stored separately
interface SemanticAnnotations {
  [nodeId: string]: {
    tags?: string[]
    note?: string
    sectionType?: SectionType
  }
}

interface SemanticUpdatePayload {
  addTag?: string
  removeTag?: string
  sectionType?: SectionType
  note?: string
}

// For undo functionality
interface DeletedNodeInfo {
  nodeType: 'element' | 'slide' | 'section'
  node: SemanticNode
  location: {
    parentId?: string
    index: number
  }
}

interface SemanticStore {
  // Current package
  package: H5PPackage | null
  semanticJson: SemanticPackage | null
  mediaBlobs: Map<string, Blob>
  semanticAnnotations: SemanticAnnotations
  
  // UI state
  selectedSlideIndex: number
  selectedElementId: string | null
  lastDeleted: DeletedNodeInfo | null
  
  // Actions
  setPackage: (pkg: H5PPackage, blobs: Map<string, Blob>) => void
  clearPackage: () => void
  setSelectedSlide: (index: number) => void
  setSelectedElement: (id: string | null) => void
  
  // Editing actions
  updateSlideTitle: (slideIndex: number, title: string) => void
  updateElementContent: (slideIndex: number, elementId: string, content: Partial<SemanticNode['content']>) => void
  moveSlide: (fromIndex: number, toIndex: number) => void
  moveElement: (slideIndex: number, fromElementIndex: number, toElementIndex: number) => void
  
  // Tree operations
  updateNodeSemantics: (nodeId: string, nodeType: string, update: SemanticUpdatePayload) => void
  moveElementToSlide: (elementId: string, fromSlideId: string, toSlideId: string, position?: number) => void
  moveSlideToSection: (slideId: string, fromSectionId: string, toSectionId: string, position?: number) => void
  getNodeAnnotations: (nodeId: string) => SemanticAnnotations[string] | undefined
  
  // Nesting operations
  nestElementUnder: (childId: string, parentId: string) => void
  unnestElement: (elementId: string) => void
  moveElementUp: (elementId: string) => void
  moveElementDown: (elementId: string) => void
  setElementSemanticTag: (elementId: string, tag: SemanticRole, headingLevel?: HeadingLevel) => void
  addNewElement: (slideId: string, afterElementId?: string) => string | null
  
  // Move any node (element, slide, section)
  moveNodeUp: (nodeId: string, nodeType: 'element' | 'slide' | 'section') => void
  moveNodeDown: (nodeId: string, nodeType: 'element' | 'slide' | 'section') => void
  
  // Section operations
  addNewSection: (afterSectionId?: string) => string | null
  
  // Title update operations
  updatePackageTitle: (title: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void
  updateElementLabel: (elementId: string, label: string) => void
  
  // Delete operations
  deleteNode: (nodeId: string, nodeType: 'element' | 'slide' | 'section') => void
  undoDelete: () => void
  
  // Helper to find node location in tree
  findNodeLocation: (nodeId: string) => { 
    parentId: string | null
    node: SemanticNode
    index: number
    ancestors: SemanticNode[]
  } | null
  
  // Export actions
  exportJson: () => void
  exportZip: () => Promise<void>
  
  // Get helpers - return H1 and H2 level nodes
  getCurrentSlide: () => SemanticNode | null
  getSlides: () => SemanticNode[]
  getSections: () => SemanticNode[]
}

// Helper to find a node by ID in the tree
function findNodeInTree(
  nodes: SemanticNode[], 
  nodeId: string, 
  parentId: string | null = null,
  ancestors: SemanticNode[] = []
): { parentId: string | null; node: SemanticNode; index: number; ancestors: SemanticNode[] } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === nodeId) {
      return { parentId, node, index: i, ancestors }
    }
    if (node.children) {
      const found = findNodeInTree(node.children, nodeId, node.id, [...ancestors, node])
      if (found) return found
    }
  }
  return null
}

// Helper to get all H1 (section) nodes
function getH1Nodes(structure: SemanticPackage['structure']): SemanticNode[] {
  return structure.children.filter(n => n.headingLevel === 1)
}

// Helper to get all H2 (slide) nodes from the structure
function getH2Nodes(structure: SemanticPackage['structure']): SemanticNode[] {
  const slides: SemanticNode[] = []
  for (const section of structure.children) {
    if (section.headingLevel === 1 && section.children) {
      slides.push(...section.children.filter(n => n.headingLevel === 2))
    }
  }
  return slides
}

// Helper to get slide by index (H2 nodes indexed globally)
function getSlideByIndex(structure: SemanticPackage['structure'], index: number): SemanticNode | null {
  const slides = getH2Nodes(structure)
  return slides[index] || null
}

export const useSemanticStore = create<SemanticStore>((set, get) => ({
  package: null,
  semanticJson: null,
  mediaBlobs: new Map(),
  semanticAnnotations: {},
  selectedSlideIndex: 0,
  selectedElementId: null,
  lastDeleted: null,
  
  setPackage: (pkg, blobs) => {
    const semanticJson = transformToSemantic(pkg)
    set({ 
      package: pkg, 
      semanticJson, 
      mediaBlobs: blobs,
      semanticAnnotations: {},
      selectedSlideIndex: 0, 
      selectedElementId: null 
    })
  },
  
  clearPackage: () => {
    const pkg = get().package
    if (pkg) {
      for (const url of pkg.media.values()) {
        URL.revokeObjectURL(url)
      }
    }
    set({ 
      package: null, 
      semanticJson: null, 
      mediaBlobs: new Map(),
      semanticAnnotations: {},
      selectedSlideIndex: 0, 
      selectedElementId: null 
    })
  },
  
  setSelectedSlide: (index) => {
    set({ selectedSlideIndex: index, selectedElementId: null })
  },
  
  setSelectedElement: (id) => {
    set({ selectedElementId: id })
  },
  
  updateSlideTitle: (slideIndex, title) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const slide = getSlideByIndex(newJson.structure, slideIndex)
    if (slide) {
      slide.title = title
      set({ semanticJson: newJson })
    }
  },
  
  updateElementContent: (_slideIndex, elementId, contentUpdate) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const loc = findNodeInTree(newJson.structure.children, elementId)
    if (loc?.node?.content) {
      loc.node.content = { ...loc.node.content, ...contentUpdate } as SemanticNode['content']
      set({ semanticJson: newJson })
    }
  },
  
  moveSlide: (fromIndex, toIndex) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    // For simplicity, work within the first section
    const section = newJson.structure.children.find(n => n.headingLevel === 1)
    if (!section?.children) return
    
    const slides = section.children.filter(n => n.headingLevel === 2)
    if (fromIndex >= slides.length || toIndex >= slides.length) return
    
    const [removed] = slides.splice(fromIndex, 1)
    slides.splice(toIndex, 0, removed)
    
    // Rebuild section children preserving non-slide nodes
    section.children = slides
    set({ semanticJson: newJson })
  },
  
  moveElement: (slideIndex, fromElementIndex, toElementIndex) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const slide = getSlideByIndex(newJson.structure, slideIndex)
    if (!slide?.children) return
    
    const children = [...slide.children]
    const [removed] = children.splice(fromElementIndex, 1)
    children.splice(toElementIndex, 0, removed)
    slide.children = children
    
    set({ semanticJson: newJson })
  },
  
  updateNodeSemantics: (nodeId, _nodeType, update) => {
    const { semanticAnnotations, semanticJson } = get()
    const current = semanticAnnotations[nodeId] || { tags: [] }
    const newAnnotation = { ...current }
    
    if (update.addTag) {
      newAnnotation.tags = [...(newAnnotation.tags || []), update.addTag]
    }
    if (update.removeTag) {
      newAnnotation.tags = (newAnnotation.tags || []).filter(t => t !== update.removeTag)
    }
    if (update.note !== undefined) {
      newAnnotation.note = update.note
    }
    if (update.sectionType && semanticJson) {
      newAnnotation.sectionType = update.sectionType
      newAnnotation.tags = [update.sectionType]
      
      const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
      const loc = findNodeInTree(newJson.structure.children, nodeId)
      if (loc?.node) {
        loc.node.sectionType = update.sectionType
        set({ 
          semanticAnnotations: { ...semanticAnnotations, [nodeId]: newAnnotation },
          semanticJson: newJson 
        })
        return
      }
    }
    
    set({ semanticAnnotations: { ...semanticAnnotations, [nodeId]: newAnnotation } })
  },
  
  moveElementToSlide: (elementId, fromSlideId, toSlideId, position) => {
    const { semanticJson } = get()
    if (!semanticJson || fromSlideId === toSlideId) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    // Find and remove element from source
    const fromLoc = findNodeInTree(newJson.structure.children, elementId)
    if (!fromLoc) return
    
    const fromParent = findNodeInTree(newJson.structure.children, fromLoc.parentId || '')
    if (!fromParent?.node?.children) return
    
    const [movedElement] = fromParent.node.children.splice(fromLoc.index, 1)
    
    // Find target slide and add element
    const toSlide = findNodeInTree(newJson.structure.children, toSlideId)
    if (!toSlide?.node) return
    
    if (!toSlide.node.children) toSlide.node.children = []
    if (position !== undefined) {
      toSlide.node.children.splice(position, 0, movedElement)
    } else {
      toSlide.node.children.push(movedElement)
    }
    
    set({ semanticJson: newJson })
  },
  
  moveSlideToSection: (slideId, fromSectionId, toSectionId, position) => {
    const { semanticJson } = get()
    if (!semanticJson || fromSectionId === toSectionId) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    // Find and remove slide from source section
    const fromSection = newJson.structure.children.find(n => n.id === fromSectionId)
    if (!fromSection?.children) return
    
    const slideIndex = fromSection.children.findIndex(n => n.id === slideId)
    if (slideIndex === -1) return
    
    const [movedSlide] = fromSection.children.splice(slideIndex, 1)
    
    // Find target section and add slide
    const toSection = newJson.structure.children.find(n => n.id === toSectionId)
    if (!toSection) return
    
    if (!toSection.children) toSection.children = []
    if (position !== undefined) {
      toSection.children.splice(position, 0, movedSlide)
    } else {
      toSection.children.push(movedSlide)
    }
    
    set({ semanticJson: newJson })
  },
  
  getNodeAnnotations: (nodeId) => {
    return get().semanticAnnotations[nodeId]
  },
  
  getCurrentSlide: () => {
    const { semanticJson, selectedSlideIndex } = get()
    if (!semanticJson) return null
    return getSlideByIndex(semanticJson.structure, selectedSlideIndex)
  },
  
  exportJson: () => {
    const { semanticJson } = get()
    if (!semanticJson) return
    downloadSemanticJson(semanticJson)
  },
  
  exportZip: async () => {
    const { semanticJson, mediaBlobs } = get()
    if (!semanticJson) return
    await downloadZipBundle(semanticJson, mediaBlobs)
  },
  
  getSlides: () => {
    const { semanticJson } = get()
    if (!semanticJson) return []
    return getH2Nodes(semanticJson.structure)
  },
  
  getSections: () => {
    const { semanticJson } = get()
    if (!semanticJson) return []
    return getH1Nodes(semanticJson.structure)
  },
  
  findNodeLocation: (nodeId) => {
    const { semanticJson } = get()
    if (!semanticJson) return null
    return findNodeInTree(semanticJson.structure.children, nodeId)
  },
  
  nestElementUnder: (childId, parentId) => {
    const { semanticJson } = get()
    if (!semanticJson || childId === parentId) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    // Find and remove child
    const childLoc = findNodeInTree(newJson.structure.children, childId)
    if (!childLoc) return
    
    // Remove from current location
    const removeFromParent = (nodes: SemanticNode[]): SemanticNode | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === childId) {
          return nodes.splice(i, 1)[0]
        }
        if (nodes[i].children) {
          const found = removeFromParent(nodes[i].children!)
          if (found) return found
        }
      }
      return null
    }
    
    const removedChild = removeFromParent(newJson.structure.children)
    if (!removedChild) return
    
    // Find parent and add child
    const addToParent = (nodes: SemanticNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === parentId) {
          if (!node.children) node.children = []
          node.children.push(removedChild)
          return true
        }
        if (node.children && addToParent(node.children)) return true
      }
      return false
    }
    
    if (addToParent(newJson.structure.children)) {
      set({ semanticJson: newJson })
    }
  },
  
  unnestElement: (elementId) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    // Find element and its parent
    const loc = findNodeInTree(newJson.structure.children, elementId)
    if (!loc || !loc.parentId) return // Can't unnest if not nested
    
    // Find parent and grandparent
    const parentLoc = findNodeInTree(newJson.structure.children, loc.parentId)
    if (!parentLoc?.node?.children) return
    
    // Remove from parent's children
    const [unnestedElement] = parentLoc.node.children.splice(loc.index, 1)
    
    // Find grandparent to insert into
    if (parentLoc.parentId) {
      const grandparentLoc = findNodeInTree(newJson.structure.children, parentLoc.parentId)
      if (grandparentLoc?.node?.children) {
        grandparentLoc.node.children.splice(parentLoc.index + 1, 0, unnestedElement)
      }
    } else {
      // Parent is at top level, insert into structure.children
      const parentIdx = newJson.structure.children.findIndex(n => n.id === loc.parentId)
      if (parentIdx !== -1) {
        newJson.structure.children.splice(parentIdx + 1, 0, unnestedElement)
      }
    }
    
    set({ semanticJson: newJson })
  },
  
  moveElementUp: (elementId) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    const moveUp = (nodes: SemanticNode[]): boolean => {
      const idx = nodes.findIndex(n => n.id === elementId)
      if (idx > 0) {
        const temp = nodes[idx - 1]
        nodes[idx - 1] = nodes[idx]
        nodes[idx] = temp
        return true
      }
      for (const node of nodes) {
        if (node.children && moveUp(node.children)) return true
      }
      return false
    }
    
    if (moveUp(newJson.structure.children)) {
      set({ semanticJson: newJson })
    }
  },
  
  moveElementDown: (elementId) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    const moveDown = (nodes: SemanticNode[]): boolean => {
      const idx = nodes.findIndex(n => n.id === elementId)
      if (idx !== -1 && idx < nodes.length - 1) {
        const temp = nodes[idx + 1]
        nodes[idx + 1] = nodes[idx]
        nodes[idx] = temp
        return true
      }
      for (const node of nodes) {
        if (node.children && moveDown(node.children)) return true
      }
      return false
    }
    
    if (moveDown(newJson.structure.children)) {
      set({ semanticJson: newJson })
    }
  },
  
  setElementSemanticTag: (elementId, tag, headingLevel) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    const setTag = (nodes: SemanticNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === elementId) {
          node.semanticRole = tag
          if (tag === 'heading' && headingLevel) {
            node.headingLevel = headingLevel
          } else if (tag !== 'heading') {
            delete node.headingLevel
          }
          return true
        }
        if (node.children && setTag(node.children)) return true
      }
      return false
    }
    
    if (setTag(newJson.structure.children)) {
      set({ semanticJson: newJson })
    }
  },
  
  addNewElement: (slideId, afterElementId) => {
    const { semanticJson } = get()
    if (!semanticJson) return null
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const newId = `node-${Date.now()}`
    
    const newElement: SemanticNode = {
      id: newId,
      semanticRole: 'text',
      contentType: 'text',
      content: { type: 'text', markdown: '', plainText: 'New element' },
      position: { x: 0, y: 0 },
    }
    
    // If afterElementId is provided, insert after that element
    if (afterElementId) {
      const insertAfter = (nodes: SemanticNode[]): boolean => {
        const idx = nodes.findIndex(n => n.id === afterElementId)
        if (idx !== -1) {
          nodes.splice(idx + 1, 0, newElement)
          return true
        }
        for (const node of nodes) {
          if (node.children && insertAfter(node.children)) return true
        }
        return false
      }
      
      if (insertAfter(newJson.structure.children)) {
        set({ semanticJson: newJson })
        return newId
      }
    }
    
    // Otherwise, add to slide's children
    const slide = findNodeInTree(newJson.structure.children, slideId)
    if (slide?.node) {
      if (!slide.node.children) slide.node.children = []
      slide.node.children.push(newElement)
      set({ semanticJson: newJson })
      return newId
    }
    
    return null
  },
  
  moveNodeUp: (nodeId, nodeType) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    if (nodeType === 'section') {
      const sections = newJson.structure.children
      const idx = sections.findIndex(s => s.id === nodeId)
      if (idx > 0) {
        const temp = sections[idx - 1]
        sections[idx - 1] = sections[idx]
        sections[idx] = temp
        set({ semanticJson: newJson })
      }
    } else if (nodeType === 'slide') {
      // Find slide's parent section and move within it
      for (const section of newJson.structure.children) {
        if (!section.children) continue
        const idx = section.children.findIndex(n => n.id === nodeId)
        if (idx > 0) {
          const temp = section.children[idx - 1]
          section.children[idx - 1] = section.children[idx]
          section.children[idx] = temp
          set({ semanticJson: newJson })
          return
        }
      }
    } else if (nodeType === 'element') {
      get().moveElementUp(nodeId)
    }
  },
  
  moveNodeDown: (nodeId, nodeType) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    if (nodeType === 'section') {
      const sections = newJson.structure.children
      const idx = sections.findIndex(s => s.id === nodeId)
      if (idx !== -1 && idx < sections.length - 1) {
        const temp = sections[idx + 1]
        sections[idx + 1] = sections[idx]
        sections[idx] = temp
        set({ semanticJson: newJson })
      }
    } else if (nodeType === 'slide') {
      for (const section of newJson.structure.children) {
        if (!section.children) continue
        const idx = section.children.findIndex(n => n.id === nodeId)
        if (idx !== -1 && idx < section.children.length - 1) {
          const temp = section.children[idx + 1]
          section.children[idx + 1] = section.children[idx]
          section.children[idx] = temp
          set({ semanticJson: newJson })
          return
        }
      }
    } else if (nodeType === 'element') {
      get().moveElementDown(nodeId)
    }
  },
  
  addNewSection: (afterSectionId) => {
    const { semanticJson } = get()
    if (!semanticJson) return null
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const newId = `section-${Date.now()}`
    
    const newSection: SemanticNode = {
      id: newId,
      headingLevel: 1,
      title: 'New Section',
      children: [],
    }
    
    if (afterSectionId) {
      const idx = newJson.structure.children.findIndex(s => s.id === afterSectionId)
      if (idx !== -1) {
        newJson.structure.children.splice(idx + 1, 0, newSection)
      } else {
        newJson.structure.children.push(newSection)
      }
    } else {
      newJson.structure.children.push(newSection)
    }
    
    set({ semanticJson: newJson })
    return newId
  },
  
  updatePackageTitle: (title) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = { ...semanticJson, title }
    set({ semanticJson: newJson })
  },
  
  updateSectionTitle: (sectionId, title) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const loc = findNodeInTree(newJson.structure.children, sectionId)
    if (loc?.node) {
      loc.node.title = title
      set({ semanticJson: newJson })
    }
  },
  
  updateElementLabel: (elementId, label) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    
    const updateLabel = (nodes: SemanticNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === elementId) {
          // For heading nodes, update title
          if (node.headingLevel) {
            node.title = label
            return true
          }
          // For text content nodes, update the plainText
          if (node.content?.type === 'text') {
            (node.content as SemanticTextContent).plainText = label
            ;(node.content as SemanticTextContent).markdown = label
            return true
          }
          return true
        }
        if (node.children && updateLabel(node.children)) return true
      }
      return false
    }
    
    if (updateLabel(newJson.structure.children)) {
      set({ semanticJson: newJson })
    }
  },
  
  deleteNode: (nodeId, nodeType) => {
    const { semanticJson } = get()
    if (!semanticJson) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    let deletedInfo: DeletedNodeInfo | null = null
    
    const removeNode = (nodes: SemanticNode[], parentId?: string): boolean => {
      const idx = nodes.findIndex(n => n.id === nodeId)
      if (idx !== -1) {
        const removed = nodes.splice(idx, 1)[0]
        deletedInfo = {
          nodeType,
          node: removed,
          location: {
            parentId,
            index: idx
          }
        }
        return true
      }
      for (const node of nodes) {
        if (node.children && removeNode(node.children, node.id)) return true
      }
      return false
    }
    
    if (removeNode(newJson.structure.children)) {
      set({ semanticJson: newJson, lastDeleted: deletedInfo })
    }
  },
  
  undoDelete: () => {
    const { semanticJson, lastDeleted } = get()
    if (!semanticJson || !lastDeleted) return
    
    const newJson = JSON.parse(JSON.stringify(semanticJson)) as SemanticPackage
    const { node, location } = lastDeleted
    
    if (location.parentId) {
      // Insert into parent's children
      const parent = findNodeInTree(newJson.structure.children, location.parentId)
      if (parent?.node) {
        if (!parent.node.children) parent.node.children = []
        parent.node.children.splice(location.index, 0, node)
      }
    } else {
      // Insert at top level
      newJson.structure.children.splice(location.index, 0, node)
    }
    
    set({ semanticJson: newJson, lastDeleted: null })
  },
}))
