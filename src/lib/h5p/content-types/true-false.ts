import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticTrueFalseData } from '../../semantic/schema'
import { stripHtml } from './media'

interface TrueFalseParams {
  question?: string
  correct?: 'true' | 'false' | boolean
  l10n?: {
    trueText?: string
    falseText?: string
  }
}

/**
 * Parse H5P.TrueFalse
 */
export function parseTrueFalse(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as TrueFalseParams
  
  const question = params.question || ''
  const correct = params.correct === 'true' || params.correct === true
  const l10n = params.l10n || {}
  
  const data: SemanticTrueFalseData = {
    quizType: 'truefalse',
    question: stripHtml(question),
    questionHtml: question,
    correctAnswer: correct,
    trueLabel: l10n.trueText || 'True',
    falseLabel: l10n.falseText || 'False',
  }
  
  return {
    type: 'quiz',
    quizType: 'truefalse',
    data,
  }
}




