import { useState } from 'react'
import type { SemanticQuizContent, SemanticMarkTheWordsData } from '../../lib/semantic/schema'

interface MarkTheWordsQuizProps {
  content: SemanticQuizContent
}

export default function MarkTheWordsQuiz({ content }: MarkTheWordsQuizProps) {
  const data = content.data as SemanticMarkTheWordsData
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [isChecked, setIsChecked] = useState(false)
  
  // Split text into words while preserving punctuation
  const words = data.text.split(/(\s+)/).filter(w => w.trim())
  
  const handleWordClick = (word: string) => {
    if (isChecked) return
    
    const cleanWord = word.replace(/[.,!?;:'"]/g, '').toLowerCase()
    const newSelected = new Set(selectedWords)
    
    if (newSelected.has(cleanWord)) {
      newSelected.delete(cleanWord)
    } else {
      newSelected.add(cleanWord)
    }
    
    setSelectedWords(newSelected)
  }
  
  const handleCheck = () => {
    setIsChecked(true)
  }
  
  const handleRetry = () => {
    setSelectedWords(new Set())
    setIsChecked(false)
  }
  
  const isWordCorrect = (word: string): boolean => {
    const cleanWord = word.replace(/[.,!?;:'"]/g, '').toLowerCase()
    return data.correctWords.some(cw => cw.toLowerCase() === cleanWord)
  }
  
  const isWordSelected = (word: string): boolean => {
    const cleanWord = word.replace(/[.,!?;:'"]/g, '').toLowerCase()
    return selectedWords.has(cleanWord)
  }
  
  const getScore = () => {
    let correct = 0
    let total = data.correctWords.length
    
    data.correctWords.forEach(cw => {
      if (selectedWords.has(cw.toLowerCase())) correct++
    })
    
    // Penalize wrong selections
    const wrongSelections = Array.from(selectedWords).filter(
      sw => !data.correctWords.some(cw => cw.toLowerCase() === sw)
    ).length
    
    return { correct, total, wrong: wrongSelections }
  }
  
  const score = isChecked ? getScore() : null
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 max-w-2xl">
      {/* Instructions */}
      <p className="text-slate-400 text-sm mb-4">Click on the words that should be marked:</p>
      
      {/* Text with clickable words */}
      <div className="text-lg leading-loose mb-6">
        {words.map((word, idx) => {
          const isSelected = isWordSelected(word)
          const isCorrect = isWordCorrect(word)
          
          // Skip whitespace-only tokens
          if (!word.trim()) {
            return <span key={idx}> </span>
          }
          
          let className = 'px-1 rounded cursor-pointer transition-colors '
          
          if (isChecked) {
            if (isCorrect && isSelected) {
              className += 'bg-green-600 text-white'
            } else if (isCorrect && !isSelected) {
              className += 'bg-yellow-600/50 text-yellow-200 border-b-2 border-yellow-400'
            } else if (!isCorrect && isSelected) {
              className += 'bg-red-600 text-white line-through'
            } else {
              className += 'hover:bg-slate-700'
            }
          } else {
            if (isSelected) {
              className += 'bg-blue-600 text-white'
            } else {
              className += 'hover:bg-slate-700'
            }
          }
          
          return (
            <span
              key={idx}
              onClick={() => handleWordClick(word)}
              className={className}
            >
              {word}
            </span>
          )
        })}
      </div>
      
      {/* Legend when checked */}
      {isChecked && (
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-green-600 rounded" /> Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-yellow-600/50 border-b-2 border-yellow-400 rounded" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-red-600 rounded" /> Wrong
          </span>
        </div>
      )}
      
      {/* Actions and Score */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={selectedWords.size === 0}
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
            <p className={`text-lg font-semibold ${score.correct === score.total && score.wrong === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {score.correct} / {score.total}
              {score.wrong > 0 && (
                <span className="text-red-400 text-sm ml-2">
                  ({score.wrong} wrong)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}




