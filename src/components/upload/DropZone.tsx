import { useState, useCallback, useRef } from 'react'
import { useH5PParser } from '../../hooks/useH5PParser'
import type { H5PPackage } from '../../lib/h5p/types'

interface DropZoneProps {
  onPackageLoaded: (pkg: H5PPackage, blobs: Map<string, Blob>) => void
}

export default function DropZone({ onPackageLoaded }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isLoading, error, parse } = useH5PParser()
  
  const handleFile = useCallback(async (file: File) => {
    const result = await parse(file)
    if (result) {
      onPackageLoaded(result.package, result.mediaBlobs)
    }
  }, [parse, onPackageLoaded])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])
  
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  return (
    <div className="w-full max-w-xl">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragOver 
            ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]' 
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".h5p,.zip"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300">Parsing H5P package...</p>
            </>
          ) : (
            <>
              <svg
                className={`w-16 h-16 ${isDragOver ? 'text-cyan-400' : 'text-slate-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p className="text-lg text-slate-300">
                  Drop your <span className="text-cyan-400 font-medium">.h5p</span> file here
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  or click to browse
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>CoursePresentation</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>InteractiveVideo</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Quizzes</span>
        </div>
      </div>
    </div>
  )
}

