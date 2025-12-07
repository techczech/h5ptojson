import { useNavigate } from 'react-router-dom'
import DropZone from '../components/upload/DropZone'
import { useSemanticStore } from '../hooks/useSemanticStore'
import type { H5PPackage } from '../lib/h5p/types'

export default function Home() {
  const navigate = useNavigate()
  const { setPackage } = useSemanticStore()

  const handlePackageLoaded = (pkg: H5PPackage, blobs: Map<string, Blob>) => {
    if (pkg) {
      setPackage(pkg, blobs)
      navigate('/viewer')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          H5P to Semantic JSON
        </h1>
        <p className="text-slate-400 text-lg">
          Upload an H5P package to convert it to semantic JSON format. 
          View, edit, and export your interactive content.
        </p>
      </div>
      
      <DropZone onPackageLoaded={handlePackageLoaded} />
      
      <div className="mt-12 text-sm text-slate-500">
        <p>Supports CoursePresentation, InteractiveVideo, and all quiz types</p>
      </div>
    </div>
  )
}

