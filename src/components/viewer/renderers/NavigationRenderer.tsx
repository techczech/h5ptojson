import type { SemanticContent, SemanticNavigationContent } from '../../../lib/semantic/schema'
import { useSemanticStore } from '../../../hooks/useSemanticStore'

interface NavigationRendererProps {
  content: SemanticContent
}

export default function NavigationRenderer({ content }: NavigationRendererProps) {
  const { setSelectedSlide, selectedSlideIndex, getSlides } = useSemanticStore()
  
  if (content.type !== 'navigation') return null
  
  const navContent = content as SemanticNavigationContent
  const slides = getSlides()
  
  const handleClick = () => {
    let targetIndex: number
    
    switch (navContent.navigationType) {
      case 'next':
        targetIndex = Math.min(selectedSlideIndex + 1, slides.length - 1)
        break
      case 'previous':
        targetIndex = Math.max(selectedSlideIndex - 1, 0)
        break
      case 'specified':
      default:
        targetIndex = (navContent.targetSlide ?? 1) - 1
        break
    }
    
    setSelectedSlide(targetIndex)
  }
  
  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
    >
      {navContent.title || (navContent.navigationType === 'next' ? 'Next' : 'Previous')}
    </button>
  )
}




