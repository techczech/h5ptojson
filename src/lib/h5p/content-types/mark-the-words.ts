import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticMarkTheWordsData } from '../../semantic/schema'

interface MarkTheWordsParams {
  textField?: string
  behaviour?: {
    enableRetry?: boolean
    enableSolutionsButton?: boolean
  }
}

/**
 * Parse H5P.MarkTheWords
 * 
 * In MarkTheWords, correct words are marked with *word*
 */
export function parseMarkTheWords(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as MarkTheWordsParams
  
  const text = params.textField || ''
  
  // Extract correct words - format is *word*
  const wordPattern = /\*([^*]+)\*/g
  const correctWords: string[] = []
  
  let match
  while ((match = wordPattern.exec(text)) !== null) {
    correctWords.push(match[1].trim())
  }
  
  // Clean text for display (remove asterisks)
  const cleanText = text.replace(/\*([^*]+)\*/g, '$1')
  
  const data: SemanticMarkTheWordsData = {
    quizType: 'markthewords',
    text: cleanText,
    correctWords,
  }
  
  return {
    type: 'quiz',
    quizType: 'markthewords',
    data,
  }
}


