import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent } from '../../semantic/schema'

interface DragQuestionParams {
  question?: {
    task?: {
      elements?: unknown[]
      dropZones?: unknown[]
    }
    settings?: {
      background?: unknown
    }
  }
  behaviour?: {
    enableRetry?: boolean
    enableCheckButton?: boolean
  }
}

/**
 * Parse H5P.DragQuestion
 * 
 * This is a complex type with draggable elements and drop zones.
 * For now, we preserve the raw structure for the editor.
 */
export function parseDragQuestion(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as DragQuestionParams
  
  // DragQuestion is complex - preserve raw data for now
  // A full implementation would parse elements and dropZones
  
  return {
    type: 'quiz',
    quizType: 'dragquestion',
    data: {
      quizType: 'dragtext',
      text: JSON.stringify(params),
      droppables: [],
    },
  }
}

