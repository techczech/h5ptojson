import { useState } from 'react'
import type { SemanticQuizContent, SemanticDragTextData } from '../../lib/semantic/schema'

interface DragTextQuizProps {
  content: SemanticQuizContent
}

export default function DragTextQuiz({ content }: DragTextQuizProps) {
  const data = content.data as SemanticDragTextData
  const [answers, setAnswers] = useState<Map<number, string>>(new Map())
  const [isChecked, setIsChecked] = useState(false)
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  
  // Get available words (not yet placed)
  const placedWords = new Set(answers.values())
  const availableWords = data.droppables
    .map(d => d.text)
    .filter(word => !placedWords.has(word))
  
  const handleDrop = (position: number) => {
    if (isChecked || !draggedWord) return
    
    const newAnswers = new Map(answers)
    newAnswers.set(position, draggedWord)
    setAnswers(newAnswers)
    setDraggedWord(null)
  }
  
  const handleRemove = (position: number) => {
    if (isChecked) return
    const newAnswers = new Map(answers)
    newAnswers.delete(position)
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
    
    const droppable = data.droppables.find(d => d.position === position)
    if (!droppable) return null
    
    const userAnswer = answers.get(position)
    return userAnswer === droppable.text ? 'correct' : 'incorrect'
  }
  
  const getScore = () => {
    let correct = 0
    data.droppables.forEach(d => {
      if (answers.get(d.position) === d.text) correct++
    })
    return { correct, total: data.droppables.length }
  }
  
  // Render text with drop zones
  const renderText = () => {
    const parts = data.text.split('_____')
    const elements: React.ReactNode[] = []
    
    parts.forEach((part, idx) => {
      elements.push(<span key={`text-${idx}`}>{part}</span>)
      
      if (idx < data.droppables.length) {
        const droppable = data.droppables[idx]
        const answer = answers.get(droppable.position)
        const result = getResult(droppable.position)
        
        elements.push(
          <span
            key={`drop-${idx}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(droppable.position)}
            onClick={() => answer && handleRemove(droppable.position)}
            className={`inline-block mx-1 px-3 py-1 min-w-[80px] text-center rounded border-2 border-dashed transition-colors cursor-pointer ${
              answer
                ? result === 'correct'
                  ? 'border-green-500 bg-green-900/30 border-solid'
                  : result === 'incorrect'
                    ? 'border-red-500 bg-red-900/30 border-solid'
                    : 'border-blue-500 bg-blue-900/30 border-solid'
                : 'border-slate-500 hover:border-blue-400'
            }`}
          >
            {answer || '...'}
          </span>
        )
        
        {/* Show correct answer if incorrect */}
        if (result === 'incorrect') {
          elements.push(
            <span key={`answer-${idx}`} className="text-green-400 text-sm ml-1">
              ({droppable.text})
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
      <p className="text-slate-400 text-sm mb-4">Drag the words to the correct positions:</p>
      
      {/* Word bank */}
      {!isChecked && (
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-700/50 rounded-lg">
          {availableWords.map((word, idx) => (
            <span
              key={idx}
              draggable
              onDragStart={() => setDraggedWord(word)}
              onDragEnd={() => setDraggedWord(null)}
              className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded cursor-move transition-colors ${
                draggedWord === word ? 'opacity-50' : ''
              }`}
            >
              {word}
            </span>
          ))}
          {availableWords.length === 0 && (
            <span className="text-slate-500 text-sm">All words placed</span>
          )}
        </div>
      )}
      
      {/* Text with drop zones */}
      <div className="text-lg leading-loose mb-6">
        {renderText()}
      </div>
      
      {/* Actions and Score */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={answers.size < data.droppables.length}
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


