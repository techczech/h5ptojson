import { useNavigate } from 'react-router-dom'
import { useSemanticStore } from '../hooks/useSemanticStore'
import StructurePanel from '../components/editor/StructurePanel'
import ContentEditor from '../components/editor/ContentEditor'

export default function Editor() {
  const navigate = useNavigate()
  const { package: pkg, semanticJson, selectedSlideIndex } = useSemanticStore()

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-slate-400 mb-4">No package loaded</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Upload a package
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{pkg.metadata.title || 'Untitled Package'}</h1>
            <p className="text-sm text-slate-400">Editor Mode</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/viewer')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              View
            </button>
            <button
              onClick={() => navigate('/tree')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Tree
            </button>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(semanticJson, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'semantic.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              New
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex">
        <aside className="w-80 border-r border-slate-700 bg-slate-800/30 overflow-y-auto">
          <StructurePanel />
        </aside>
        <div className="flex-1 overflow-y-auto p-6">
          <ContentEditor slideIndex={selectedSlideIndex} />
        </div>
      </main>
    </div>
  )
}

