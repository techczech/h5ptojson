import { useState, useCallback } from 'react'
import { parseH5P, H5PParseError, ParseResult } from '../lib/h5p/parser'

interface UseH5PParserResult {
  isLoading: boolean
  error: string | null
  parse: (file: File) => Promise<ParseResult | null>
}

export function useH5PParser(): UseH5PParserResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const parse = useCallback(async (file: File): Promise<ParseResult | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Validate file type
      const isH5P = file.name.endsWith('.h5p') || 
                    file.name.endsWith('.zip') ||
                    file.type === 'application/zip'
      
      if (!isH5P) {
        throw new H5PParseError('Please upload an H5P or ZIP file')
      }
      
      const result = await parseH5P(file)
      setIsLoading(false)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse H5P file'
      setError(message)
      setIsLoading(false)
      return null
    }
  }, [])
  
  return { isLoading, error, parse }
}

