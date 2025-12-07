import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSemanticStore } from '../hooks/useSemanticStore'
import SlideViewer from '../components/viewer/SlideViewer'

export default function Viewer() {
  const navigate = useNavigate()
  const { package: pkg, exportJson, exportZip, getSections } = useSemanticStore()
  const [isExporting, setIsExporting] = useState(false)

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

  const sections = getSections()
  const slideCount = sections.reduce((acc, s) => acc + (s.children?.filter(c => c.headingLevel === 2).length || 0), 0)

  const handleExportZip = async () => {
    setIsExporting(true)
    try {
      await exportZip()
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{pkg.metadata.title || 'Untitled Package'}</h1>
            <p className="text-sm text-slate-400">
              {pkg.metadata.mainLibrary} • {pkg.metadata.language || 'en'} • {sections.length} sections • {slideCount} slides
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/editor')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => navigate('/tree')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Tree
            </button>
            <button
              onClick={exportJson}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export ZIP'}
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
      
      {/* Section overview */}
      {sections.length > 1 && (
        <div className="border-b border-slate-700 bg-slate-800/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex gap-2 flex-wrap">
            {sections.map((section) => (
              <span 
                key={section.id} 
                className={`text-xs px-2 py-1 rounded-full ${
                  section.sectionType === 'task' ? 'bg-blue-900/50 text-blue-300' :
                  section.sectionType === 'note' ? 'bg-yellow-600/50 text-yellow-200' :
                  section.sectionType === 'optional' ? 'bg-green-900/30 text-green-400' :
                  section.sectionType === 'summary' ? 'bg-cyan-400/10 text-cyan-400' :
                  'bg-slate-700 text-slate-300'
                }`}
              >
                {section.title}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto p-4">
        <SlideViewer />
      </main>
    </div>
  )
}

