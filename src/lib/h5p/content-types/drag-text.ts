import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticDragTextData } from '../../semantic/schema'

interface DragTextParams {
  textField?: string
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
    instantFeedback?: boolean
  }
}

/**
 * Parse H5P.DragText
 * 
 * In DragText, draggable words are marked with *word*
 */
export function parseDragText(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as DragTextParams
  
  const text = params.textField || ''
  
  // Extract droppables - format is *word* for draggable words
  const droppablePattern = /\*([^*]+)\*/g
  const droppables: Array<{ text: string; position: number }> = []
  
  let match
  let position = 0
  while ((match = droppablePattern.exec(text)) !== null) {
    droppables.push({
      text: match[1].trim(),
      position,
    })
    position++
  }
  
  // Clean text for display
  const cleanText = text.replace(/\*([^*]+)\*/g, '_____')
  
  const data: SemanticDragTextData = {
    quizType: 'dragtext',
    text: cleanText,
    droppables,
  }
  
  return {
    type: 'quiz',
    quizType: 'dragtext',
    data,
  }
}


