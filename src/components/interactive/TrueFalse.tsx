import { useState } from 'react'
import type { SemanticQuizContent, SemanticTrueFalseData } from '../../lib/semantic/schema'

interface TrueFalseQuizProps {
  content: SemanticQuizContent
}

export default function TrueFalseQuiz({ content }: TrueFalseQuizProps) {
  const data = content.data as SemanticTrueFalseData
  const [selected, setSelected] = useState<boolean | null>(null)
  const [isChecked, setIsChecked] = useState(false)
  
  const handleSelect = (value: boolean) => {
    if (isChecked) return
    setSelected(value)
  }
  
  const handleCheck = () => {
    if (selected === null) return
    setIsChecked(true)
  }
  
  const handleRetry = () => {
    setSelected(null)
    setIsChecked(false)
  }
  
  const isCorrect = selected === data.correctAnswer
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-xl">
      {/* Question */}
      <div 
        className="text-lg mb-6 prose prose-invert"
        dangerouslySetInnerHTML={{ __html: data.questionHtml }}
      />
      
      {/* True/False buttons */}
      <div className="flex gap-4">
        {[true, false].map((value) => {
          const label = value ? data.trueLabel : data.falseLabel
          const isSelected = selected === value
          const isCorrectAnswer = data.correctAnswer === value
          
          let bgClass = 'bg-slate-700 hover:bg-slate-600'
          let borderClass = 'border-transparent'
          
          if (isChecked) {
            if (isCorrectAnswer) {
              bgClass = 'bg-green-900/30'
              borderClass = 'border-green-500'
            } else if (isSelected && !isCorrectAnswer) {
              bgClass = 'bg-red-900/30'
              borderClass = 'border-red-500'
            }
          } else if (isSelected) {
            bgClass = 'bg-blue-900/50'
            borderClass = 'border-blue-500'
          }
          
          return (
            <button
              key={String(value)}
              onClick={() => handleSelect(value)}
              disabled={isChecked}
              className={`flex-1 py-4 px-6 rounded-lg border-2 text-lg font-medium transition-colors ${bgClass} ${borderClass} ${isChecked ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {label}
              {isChecked && isCorrectAnswer && (
                <span className="ml-2 text-green-400">✓</span>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Actions and Result */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={selected === null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Check
            </button>
          ) : (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
        
        {isChecked && (
          <p className={`text-lg font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </p>
        )}
      </div>
    </div>
  )
}




