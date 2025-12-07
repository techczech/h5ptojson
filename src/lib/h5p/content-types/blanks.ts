import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticBlanksData } from '../../semantic/schema'

interface BlanksParams {
  text?: string
  questions?: string[]
  behaviour?: {
    caseSensitive?: boolean
    showSolutionsRequiresInput?: boolean
  }
}

/**
 * Parse H5P.Blanks (Fill in the Blanks)
 * 
 * In H5P Blanks, the text contains blanks marked with *answer* or *answer/alternative*
 */
export function parseBlanks(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as BlanksParams
  
  const text = params.text || ''
  
  // Extract blanks from text - format is *answer* or *answer/alternative1/alternative2*
  const blankPattern = /\*([^*]+)\*/g
  const blanks: Array<{ position: number; answers: string[] }> = []
  
  let match
  let position = 0
  while ((match = blankPattern.exec(text)) !== null) {
    const answerText = match[1]
    // Split by / for alternatives
    const answers = answerText.split('/').map(a => a.trim())
    blanks.push({ position, answers })
    position++
  }
  
  // Clean text for display (replace blanks with underscores)
  const cleanText = text.replace(/\*([^*]+)\*/g, '_____')
  
  const data: SemanticBlanksData = {
    quizType: 'blanks',
    text: cleanText,
    blanks,
  }
  
  return {
    type: 'quiz',
    quizType: 'blanks',
    data,
  }
}


