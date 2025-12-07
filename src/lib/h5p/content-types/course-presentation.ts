import type { H5PElement, H5PPackage } from '../types'
import type { SemanticNode, SemanticNavigationContent } from '../../semantic/schema'
import { parseAction } from './index'

let elementIdCounter = 0

/**
 * Reset element ID counter (call when starting a new package)
 */
export function resetElementIdCounter(): void {
  elementIdCounter = 0
}

/**
 * Parse a single element from a CoursePresentation slide
 */
export function parseElement(element: H5PElement, slideIndex: number, pkg: H5PPackage): SemanticNode {
  const elementId = `slide-${slideIndex}-element-${elementIdCounter++}`
  
  // Navigation-only element (no action)
  if (!element.action) {
    const navContent: SemanticNavigationContent = {
      type: 'navigation',
      targetSlide: element.goToSlide,
      navigationType: element.goToSlideType || 'next',
      title: element.title,
    }
    
    return {
      id: elementId,
      contentType: 'navigation',
      position: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      },
      content: navContent,
      isButton: element.displayAsButton,
      isHidden: element.invisible,
      navigation: {
        goToSlide: element.goToSlide,
        goToType: element.goToSlideType,
      },
    }
  }
  
  // Parse the action content
  const { type, content } = parseAction(element.action, pkg)
  
  return {
    id: elementId,
    contentType: type,
    position: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    content,
    isButton: element.displayAsButton,
    isHidden: element.invisible,
    navigation: element.goToSlide !== undefined ? {
      goToSlide: element.goToSlide,
      goToType: element.goToSlideType,
    } : undefined,
  }
}


