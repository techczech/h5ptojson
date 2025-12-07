import { useSemanticStore } from '../../hooks/useSemanticStore'
import type { SemanticElement, SemanticQuizContent, SemanticMultiChoiceData, SemanticSummaryData, SemanticTrueFalseData } from '../../lib/semantic/schema'

interface QuizEditorProps {
  element: SemanticElement
  slideIndex: number
}

export default function QuizEditor({ element, slideIndex }: QuizEditorProps) {
  const content = element.content as SemanticQuizContent
  
  if (content.quizType === 'multichoice' || content.quizType === 'singlechoice') {
    return <MultiChoiceEditor element={element} slideIndex={slideIndex} />
  }
  
  if (content.quizType === 'summary') {
    return <SummaryEditor element={element} slideIndex={slideIndex} />
  }
  
  if (content.quizType === 'truefalse') {
    return <TrueFalseEditor element={element} slideIndex={slideIndex} />
  }
  
  // Fallback for other quiz types
  return (
    <div>
      <p className="text-sm text-slate-400 mb-2">Quiz type: {content.quizType}</p>
      <pre className="p-3 bg-slate-700 rounded-lg text-xs overflow-auto max-h-64">
        {JSON.stringify(content.data, null, 2)}
      </pre>
    </div>
  )
}

function MultiChoiceEditor({ element, slideIndex }: QuizEditorProps) {
  const { updateElementContent } = useSemanticStore()
  const content = element.content as SemanticQuizContent
  const data = content.data as SemanticMultiChoiceData
  
  const updateQuestion = (value: string) => {
    const newData = { ...data, question: value, questionHtml: value }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  const updateAnswer = (index: number, field: 'text' | 'correct', value: string | boolean) => {
    const newAnswers = [...data.answers]
    if (field === 'text') {
      newAnswers[index] = { ...newAnswers[index], text: value as string, textHtml: value as string }
    } else {
      newAnswers[index] = { ...newAnswers[index], correct: value as boolean }
    }
    
    const newData = { ...data, answers: newAnswers }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  const addAnswer = () => {
    const newAnswers = [...data.answers, { text: '', textHtml: '', correct: false }]
    const newData = { ...data, answers: newAnswers }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  const removeAnswer = (index: number) => {
    const newAnswers = data.answers.filter((_, i) => i !== index)
    const newData = { ...data, answers: newAnswers }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Question</label>
        <textarea
          value={data.question}
          onChange={(e) => updateQuestion(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-400">Answers</label>
          <button
            onClick={addAnswer}
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            + Add
          </button>
        </div>
        
        <div className="space-y-2">
          {data.answers.map((answer, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type={data.settings.singleAnswer ? 'radio' : 'checkbox'}
                  checked={answer.correct}
                  onChange={(e) => updateAnswer(idx, 'correct', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-slate-500">Correct</span>
              </label>
              <input
                type="text"
                value={answer.text}
                onChange={(e) => updateAnswer(idx, 'text', e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                placeholder={`Answer ${idx + 1}`}
              />
              <button
                onClick={() => removeAnswer(idx)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryEditor({ element, slideIndex }: QuizEditorProps) {
  const { updateElementContent } = useSemanticStore()
  const content = element.content as SemanticQuizContent
  const data = content.data as SemanticSummaryData
  
  const updateIntro = (value: string) => {
    const newData = { ...data, intro: value }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Introduction</label>
        <input
          type="text"
          value={data.intro}
          onChange={(e) => updateIntro(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Statements ({data.statements.length})</label>
        <div className="space-y-3">
          {data.statements.map((statement, idx) => (
            <div key={idx} className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-green-400 mb-1">Correct:</p>
              <p className="text-sm mb-2">{statement.correctAnswer}</p>
              <p className="text-xs text-slate-400 mb-1">Distractors:</p>
              <ul className="text-xs text-slate-500 list-disc list-inside">
                {statement.distractors.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrueFalseEditor({ element, slideIndex }: QuizEditorProps) {
  const { updateElementContent } = useSemanticStore()
  const content = element.content as SemanticQuizContent
  const data = content.data as SemanticTrueFalseData
  
  const updateQuestion = (value: string) => {
    const newData = { ...data, question: value, questionHtml: value }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  const updateCorrectAnswer = (value: boolean) => {
    const newData = { ...data, correctAnswer: value }
    updateElementContent(slideIndex, element.id, {
      ...content,
      data: newData,
    } as SemanticQuizContent)
  }
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Question</label>
        <textarea
          value={data.question}
          onChange={(e) => updateQuestion(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Correct Answer</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={data.correctAnswer === true}
              onChange={() => updateCorrectAnswer(true)}
              className="w-4 h-4"
            />
            <span>{data.trueLabel}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={data.correctAnswer === false}
              onChange={() => updateCorrectAnswer(false)}
              className="w-4 h-4"
            />
            <span>{data.falseLabel}</span>
          </label>
        </div>
      </div>
    </div>
  )
}

