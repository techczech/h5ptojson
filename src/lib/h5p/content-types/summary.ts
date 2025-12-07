import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticSummaryData } from '../../semantic/schema'
import { stripHtml } from './media'

interface SummaryParams {
  intro?: string
  summaries?: Array<{
    summary?: string[]
    tip?: { tip?: string }
  }>
}

/**
 * Parse H5P.Summary
 */
export function parseSummary(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as SummaryParams
  
  const intro = params.intro || 'Choose the correct statement.'
  const summaries = params.summaries || []
  
  const statements = summaries.map((item) => {
    const options = item.summary || []
    // First statement is always correct in H5P Summary
    const [correctAnswer, ...distractors] = options.map(s => stripHtml(s))
    
    return {
      correctAnswer: correctAnswer || '',
      distractors,
      tip: item.tip?.tip,
    }
  })
  
  const data: SemanticSummaryData = {
    quizType: 'summary',
    intro: stripHtml(intro),
    statements,
  }
  
  return {
    type: 'quiz',
    quizType: 'summary',
    data,
  }
}


