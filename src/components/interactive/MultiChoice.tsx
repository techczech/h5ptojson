import { useState } from 'react'
import type { SemanticQuizContent, SemanticMultiChoiceData } from '../../lib/semantic/schema'

interface MultiChoiceQuizProps {
  content: SemanticQuizContent
}

export default function MultiChoiceQuiz({ content }: MultiChoiceQuizProps) {
  const data = content.data as SemanticMultiChoiceData
  const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set())
  const [isChecked, setIsChecked] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  
  const isSingleChoice = data.settings.singleAnswer
  
  const handleSelect = (index: number) => {
    if (isChecked) return
    
    if (isSingleChoice) {
      setSelectedAnswers(new Set([index]))
    } else {
      const newSelected = new Set(selectedAnswers)
      if (newSelected.has(index)) {
        newSelected.delete(index)
      } else {
        newSelected.add(index)
      }
      setSelectedAnswers(newSelected)
    }
  }
  
  const handleCheck = () => {
    setIsChecked(true)
  }
  
  const handleRetry = () => {
    setSelectedAnswers(new Set())
    setIsChecked(false)
    setShowSolution(false)
  }
  
  const getScore = () => {
    let correct = 0
    let total = data.answers.filter(a => a.correct).length
    
    data.answers.forEach((answer, index) => {
      const isSelected = selectedAnswers.has(index)
      if (answer.correct && isSelected) correct++
    })
    
    return { correct, total }
  }
  
  const score = isChecked ? getScore() : null
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-2xl">
      {/* Question */}
      <div 
        className="text-lg mb-6 prose prose-invert"
        dangerouslySetInnerHTML={{ __html: data.questionHtml }}
      />
      
      {/* Answers */}
      <div className="space-y-3">
        {data.answers.map((answer, index) => {
          const isSelected = selectedAnswers.has(index)
          const isCorrect = answer.correct
          
          let bgClass = 'bg-slate-700 hover:bg-slate-600'
          let borderClass = 'border-transparent'
          
          if (isChecked || showSolution) {
            if (isCorrect) {
              bgClass = 'bg-green-900/30'
              borderClass = 'border-green-500'
            } else if (isSelected && !isCorrect) {
              bgClass = 'bg-red-900/30'
              borderClass = 'border-red-500'
            }
          } else if (isSelected) {
            bgClass = 'bg-blue-900/50'
            borderClass = 'border-blue-500'
          }
          
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isChecked}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${bgClass} ${borderClass} ${isChecked ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-${isSingleChoice ? 'full' : 'md'} border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{ __html: answer.textHtml }}
                />
                {(isChecked || showSolution) && isCorrect && (
                  <span className="text-green-400 text-sm">✓ Correct</span>
                )}
              </div>
              
              {isChecked && isSelected && answer.feedback && (
                <p className="mt-2 text-sm text-slate-400 pl-9">{answer.feedback}</p>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Actions and Score */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={selectedAnswers.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Check
            </button>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
              >
                {showSolution ? 'Hide' : 'Show'} Solution
              </button>
            </>
          )}
        </div>
        
        {score && (
          <div className="text-right">
            <p className={`text-lg font-semibold ${score.correct === score.total ? 'text-green-400' : 'text-yellow-400'}`}>
              {score.correct} / {score.total}
            </p>
            <p className="text-sm text-slate-400">
              {score.correct === score.total ? 'Perfect!' : 'Keep trying!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}




