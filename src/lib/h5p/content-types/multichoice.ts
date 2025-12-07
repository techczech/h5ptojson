import type { H5PAction, H5PPackage } from '../types'
import type { SemanticQuizContent, SemanticMultiChoiceData } from '../../semantic/schema'
import { stripHtml } from './media'

interface MultiChoiceParams {
  question?: string
  answers?: Array<{
    text?: string
    correct?: boolean
    tipsAndFeedback?: {
      tip?: string
      chosenFeedback?: string
      notChosenFeedback?: string
    }
  }>
  behaviour?: {
    randomAnswers?: boolean
    type?: 'auto' | 'multi' | 'single'
    singlePoint?: boolean
  }
}

/**
 * Parse H5P.MultiChoice
 */
export function parseMultiChoice(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as MultiChoiceParams
  
  const question = params.question || ''
  const answers = (params.answers || []).map((answer) => ({
    text: stripHtml(answer.text || ''),
    textHtml: answer.text || '',
    correct: answer.correct || false,
    tip: answer.tipsAndFeedback?.tip,
    feedback: answer.tipsAndFeedback?.chosenFeedback || answer.tipsAndFeedback?.notChosenFeedback,
  }))
  
  const behaviour = params.behaviour || {}
  const isSingleAnswer = behaviour.type === 'single' || 
    (behaviour.type === 'auto' && answers.filter(a => a.correct).length === 1)
  
  const data: SemanticMultiChoiceData = {
    quizType: isSingleAnswer ? 'singlechoice' : 'multichoice',
    question: stripHtml(question),
    questionHtml: question,
    answers,
    settings: {
      randomize: behaviour.randomAnswers ?? true,
      singleAnswer: isSingleAnswer,
    },
  }
  
  return {
    type: 'quiz',
    quizType: data.quizType,
    data,
  }
}

interface SingleChoiceSetParams {
  choices?: Array<{
    question?: string
    answers?: string[]
  }>
  behaviour?: {
    autoContinue?: boolean
    timeoutCorrect?: number
    timeoutWrong?: number
  }
}

/**
 * Parse H5P.SingleChoiceSet
 */
export function parseSingleChoiceSet(action: H5PAction, _pkg: H5PPackage): SemanticQuizContent {
  const params = action.params as SingleChoiceSetParams
  
  // SingleChoiceSet has multiple questions, we'll combine them
  const choices = params.choices || []
  
  // For now, take the first question if there are multiple
  const firstChoice = choices[0] || { question: '', answers: [] }
  const question = firstChoice.question || ''
  const answerTexts = firstChoice.answers || []
  
  // In SingleChoiceSet, the first answer is always correct
  const answers = answerTexts.map((text, index) => ({
    text: stripHtml(text),
    textHtml: text,
    correct: index === 0,
    tip: undefined,
    feedback: undefined,
  }))
  
  const data: SemanticMultiChoiceData = {
    quizType: 'singlechoice',
    question: stripHtml(question),
    questionHtml: question,
    answers,
    settings: {
      randomize: true,
      singleAnswer: true,
    },
  }
  
  return {
    type: 'quiz',
    quizType: 'singlechoice',
    data,
  }
}


