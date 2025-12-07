import type { SemanticNode } from '../../lib/semantic/schema'
import TextRenderer from './renderers/TextRenderer'
import ImageRenderer from './renderers/ImageRenderer'
import VideoRenderer from './renderers/VideoRenderer'
import LinkRenderer from './renderers/LinkRenderer'
import TableRenderer from './renderers/TableRenderer'
import ShapeRenderer from './renderers/ShapeRenderer'
import QuizRenderer from './renderers/QuizRenderer'
import NavigationRenderer from './renderers/NavigationRenderer'
import UnknownRenderer from './renderers/UnknownRenderer'

interface ElementRendererProps {
  element: SemanticNode
}

export default function ElementRenderer({ element }: ElementRendererProps) {
  const { contentType, content, isButton, headingLevel, title } = element
  
  // Wrap in button style if needed
  const wrapperClass = isButton 
    ? 'inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors'
    : ''
  
  const renderContent = () => {
    // For heading nodes, render as heading text
    if (headingLevel && title) {
      const headingClasses: Record<number, string> = {
        1: 'text-3xl font-bold',
        2: 'text-2xl font-semibold',
        3: 'text-xl font-semibold',
        4: 'text-lg font-medium',
        5: 'text-base font-medium',
      }
      return (
        <h3 className={headingClasses[headingLevel] || 'text-base font-medium'}>
          {title}
        </h3>
      )
    }
    
    // For content nodes, render based on content type
    if (!content) {
      return <div className="text-slate-400">No content</div>
    }
    
    switch (contentType) {
      case 'text':
        return <TextRenderer content={content} />
      case 'image':
        return <ImageRenderer content={content} />
      case 'video':
        return <VideoRenderer content={content} />
      case 'audio':
        return <VideoRenderer content={content} /> // Reuse video renderer for now
      case 'link':
        return <LinkRenderer content={content} />
      case 'table':
        return <TableRenderer content={content} />
      case 'shape':
        return <ShapeRenderer content={content} />
      case 'multichoice':
      case 'singlechoice':
      case 'summary':
      case 'truefalse':
      case 'blanks':
      case 'dragquestion':
      case 'dragtext':
      case 'markthewords':
        return <QuizRenderer element={element} />
      case 'navigation':
        return <NavigationRenderer content={content} />
      default:
        return <UnknownRenderer content={content} />
    }
  }
  
  return (
    <div className={wrapperClass}>
      {renderContent()}
    </div>
  )
}


