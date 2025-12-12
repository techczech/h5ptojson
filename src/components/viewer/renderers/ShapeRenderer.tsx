import type { SemanticContent, SemanticShapeContent } from '../../../lib/semantic/schema'

interface ShapeRendererProps {
  content: SemanticContent
}

export default function ShapeRenderer({ content }: ShapeRendererProps) {
  if (content.type !== 'shape') return null
  
  const shapeContent = content as SemanticShapeContent
  
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: shapeContent.fillColor || 'transparent',
    borderColor: shapeContent.borderColor || 'transparent',
    borderWidth: shapeContent.borderWidth || 0,
    borderStyle: 'solid',
    borderRadius: shapeContent.shapeType === 'circle' ? '50%' : 0,
  }
  
  return <div style={style} />
}




