import { useState } from 'react'
import type { SemanticQuizContent, SemanticSummaryData } from '../../lib/semantic/schema'

interface SummaryQuizProps {
  content: SemanticQuizContent
}

export default function SummaryQuiz({ content }: SummaryQuizProps) {
  const data = content.data as SemanticSummaryData
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, string>>(new Map())
  const [wrongAttempts, setWrongAttempts] = useState<Map<number, number>>(new Map())
  
  const currentStatement = data.statements[currentIndex]
  
  // Shuffle options (but keep them stable for the current statement)
  const [shuffledOptions] = useState(() => {
    return data.statements.map(s => {
      const options = [s.correctAnswer, ...s.distractors]
      return options.sort(() => Math.random() - 0.5)
    })
  })
  
  const handleSelect = (option: string) => {
    const isCorrect = option === currentStatement.correctAnswer
    
    if (isCorrect) {
      const newAnswers = new Map(selectedAnswers)
      newAnswers.set(currentIndex, option)
      setSelectedAnswers(newAnswers)
      
      // Move to next statement after a short delay
      if (currentIndex < data.statements.length - 1) {
        setTimeout(() => setCurrentIndex(currentIndex + 1), 500)
      }
    } else {
      const newWrong = new Map(wrongAttempts)
      newWrong.set(currentIndex, (newWrong.get(currentIndex) || 0) + 1)
      setWrongAttempts(newWrong)
    }
  }
  
  const isComplete = selectedAnswers.size === data.statements.length
  const totalWrong = Array.from(wrongAttempts.values()).reduce((a, b) => a + b, 0)
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-2xl">
      {/* Intro */}
      <p className="text-slate-300 mb-4">{data.intro}</p>
      
      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {data.statements.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 flex-1 rounded-full transition-colors ${
              selectedAnswers.has(idx) 
                ? 'bg-green-500' 
                : idx === currentIndex 
                  ? 'bg-blue-500' 
                  : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
      
      {!isComplete ? (
        <>
          {/* Current question */}
          <p className="text-sm text-slate-400 mb-2">
            Statement {currentIndex + 1} of {data.statements.length}
          </p>
          
          {/* Options */}
          <div className="space-y-3">
            {shuffledOptions[currentIndex]?.map((option, idx) => {
              const isSelected = selectedAnswers.get(currentIndex) === option
              
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  disabled={isSelected}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected 
                      ? 'bg-green-900/30 border-green-500' 
                      : 'bg-slate-700 hover:bg-slate-600 border-transparent'
                  }`}
                >
                  {option}
                  {isSelected && (
                    <span className="ml-2 text-green-400">✓</span>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Tip */}
          {currentStatement.tip && (
            <p className="mt-4 text-sm text-slate-400 italic">
              💡 {currentStatement.tip}
            </p>
          )}
          
          {/* Wrong attempts */}
          {(wrongAttempts.get(currentIndex) || 0) > 0 && (
            <p className="mt-2 text-sm text-red-400">
              Wrong attempts: {wrongAttempts.get(currentIndex)}
            </p>
          )}
        </>
      ) : (
        /* Completion screen */
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Complete!</h3>
          <p className="text-slate-400">
            You got all {data.statements.length} statements correct
            {totalWrong > 0 && ` with ${totalWrong} wrong attempt${totalWrong > 1 ? 's' : ''}`}.
          </p>
          
          <button
            onClick={() => {
              setCurrentIndex(0)
              setSelectedAnswers(new Map())
              setWrongAttempts(new Map())
            }}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

