import { useState } from 'react'
import type { SemanticQuizContent, SemanticBlanksData } from '../../lib/semantic/schema'

interface BlanksQuizProps {
  content: SemanticQuizContent
}

export default function BlanksQuiz({ content }: BlanksQuizProps) {
  const data = content.data as SemanticBlanksData
  const [answers, setAnswers] = useState<Map<number, string>>(new Map())
  const [isChecked, setIsChecked] = useState(false)
  
  const handleChange = (position: number, value: string) => {
    if (isChecked) return
    const newAnswers = new Map(answers)
    newAnswers.set(position, value)
    setAnswers(newAnswers)
  }
  
  const handleCheck = () => {
    setIsChecked(true)
  }
  
  const handleRetry = () => {
    setAnswers(new Map())
    setIsChecked(false)
  }
  
  const getResult = (position: number): 'correct' | 'incorrect' | null => {
    if (!isChecked) return null
    
    const blank = data.blanks.find(b => b.position === position)
    if (!blank) return null
    
    const userAnswer = (answers.get(position) || '').toLowerCase().trim()
    const isCorrect = blank.answers.some(a => a.toLowerCase().trim() === userAnswer)
    
    return isCorrect ? 'correct' : 'incorrect'
  }
  
  const getScore = () => {
    let correct = 0
    data.blanks.forEach(blank => {
      const userAnswer = (answers.get(blank.position) || '').toLowerCase().trim()
      if (blank.answers.some(a => a.toLowerCase().trim() === userAnswer)) {
        correct++
      }
    })
    return { correct, total: data.blanks.length }
  }
  
  // Render text with input fields
  const renderText = () => {
    const parts = data.text.split('_____')
    const elements: React.ReactNode[] = []
    
    parts.forEach((part, idx) => {
      elements.push(<span key={`text-${idx}`}>{part}</span>)
      
      if (idx < data.blanks.length) {
        const blank = data.blanks[idx]
        const result = getResult(blank.position)
        
        elements.push(
          <input
            key={`input-${idx}`}
            type="text"
            value={answers.get(blank.position) || ''}
            onChange={(e) => handleChange(blank.position, e.target.value)}
            disabled={isChecked}
            className={`mx-1 px-2 py-1 w-32 rounded border-2 bg-slate-700 text-center transition-colors ${
              result === 'correct' 
                ? 'border-green-500 bg-green-900/30' 
                : result === 'incorrect'
                  ? 'border-red-500 bg-red-900/30'
                  : 'border-slate-500 focus:border-blue-500'
            }`}
            placeholder="..."
          />
        )
        
        {/* Show correct answer if incorrect */}
        if (result === 'incorrect') {
          elements.push(
            <span key={`answer-${idx}`} className="text-green-400 text-sm ml-1">
              ({blank.answers[0]})
            </span>
          )
        }
      }
    })
    
    return elements
  }
  
  const score = isChecked ? getScore() : null
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-2xl">
      {/* Instructions */}
      <p className="text-slate-400 text-sm mb-4">Fill in the blanks:</p>
      
      {/* Text with blanks */}
      <div className="text-lg leading-relaxed mb-6">
        {renderText()}
      </div>
      
      {/* Actions and Score */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={answers.size < data.blanks.length}
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
        
        {score && (
          <div className="text-right">
            <p className={`text-lg font-semibold ${score.correct === score.total ? 'text-green-400' : 'text-yellow-400'}`}>
              {score.correct} / {score.total}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


