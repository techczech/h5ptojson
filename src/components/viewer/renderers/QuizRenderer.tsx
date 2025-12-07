import type { SemanticElement, SemanticQuizContent } from '../../../lib/semantic/schema'
import MultiChoiceQuiz from '../../interactive/MultiChoice'
import SummaryQuiz from '../../interactive/Summary'
import TrueFalseQuiz from '../../interactive/TrueFalse'
import BlanksQuiz from '../../interactive/Blanks'
import DragTextQuiz from '../../interactive/DragText'
import MarkTheWordsQuiz from '../../interactive/MarkTheWords'

interface QuizRendererProps {
  element: SemanticElement
}

export default function QuizRenderer({ element }: QuizRendererProps) {
  const content = element.content as SemanticQuizContent
  
  if (content.type !== 'quiz') {
    return <div className="text-slate-500">Invalid quiz content</div>
  }
  
  switch (content.quizType) {
    case 'multichoice':
    case 'singlechoice':
      return <MultiChoiceQuiz content={content} />
    case 'summary':
      return <SummaryQuiz content={content} />
    case 'truefalse':
      return <TrueFalseQuiz content={content} />
    case 'blanks':
      return <BlanksQuiz content={content} />
    case 'dragtext':
      return <DragTextQuiz content={content} />
    case 'markthewords':
      return <MarkTheWordsQuiz content={content} />
    case 'dragquestion':
      return (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">
            Drag and drop question (complex interactive - view in editor)
          </p>
        </div>
      )
    default:
      return (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-slate-400 text-sm">
            Unknown quiz type: {content.quizType}
          </p>
        </div>
      )
  }
}


