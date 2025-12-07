import JSZip from 'jszip'
import type { H5PPackage, H5PMetadata } from './types'

export class H5PParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'H5PParseError'
  }
}

export interface ParseResult {
  package: H5PPackage
  mediaBlobs: Map<string, Blob>
}

/**
 * Parse an H5P file (ZIP archive) and extract all content
 */
export async function parseH5P(file: File): Promise<ParseResult> {
  // Load the ZIP file
  const zip = await JSZip.loadAsync(file)
  
  // Extract h5p.json metadata
  const metadataFile = zip.file('h5p.json')
  if (!metadataFile) {
    throw new H5PParseError('Invalid H5P package: missing h5p.json')
  }
  const metadataText = await metadataFile.async('text')
  const metadata: H5PMetadata = JSON.parse(metadataText)
  
  // Extract content/content.json
  const contentFile = zip.file('content/content.json')
  if (!contentFile) {
    throw new H5PParseError('Invalid H5P package: missing content/content.json')
  }
  const contentText = await contentFile.async('text')
  const content = JSON.parse(contentText)
  
  // Extract all media files as blob URLs and keep blobs for export
  const { media, blobs } = await extractMedia(zip)
  
  // Extract library definitions
  const libraries = await extractLibraries(zip)
  
  return {
    package: {
      metadata,
      content,
      media,
      libraries,
    },
    mediaBlobs: blobs,
  }
}

/**
 * Extract all media files from content/ folder
 */
async function extractMedia(zip: JSZip): Promise<{ media: Map<string, string>; blobs: Map<string, Blob> }> {
  const media = new Map<string, string>()
  const blobs = new Map<string, Blob>()
  
  // Find all files in content/ that are not content.json
  const contentFolder = zip.folder('content')
  if (!contentFolder) return { media, blobs }
  
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.ogg', '.wav']
  
  const promises: Promise<void>[] = []
  
  contentFolder.forEach((relativePath, file) => {
    if (file.dir) return
    
    const ext = relativePath.toLowerCase().substring(relativePath.lastIndexOf('.'))
    if (!mediaExtensions.includes(ext)) return
    
    const promise = file.async('blob').then((blob) => {
      const url = URL.createObjectURL(blob)
      // Store with the relative path from content/ folder
      media.set(relativePath, url)
      blobs.set(relativePath, blob)
    })
    promises.push(promise)
  })
  
  await Promise.all(promises)
  return { media, blobs }
}

/**
 * Extract library definitions (library.json files)
 */
async function extractLibraries(zip: JSZip): Promise<Map<string, unknown>> {
  const libraries = new Map<string, unknown>()
  
  const promises: Promise<void>[] = []
  
  zip.forEach((relativePath, file) => {
    if (!relativePath.endsWith('/library.json')) return
    
    const promise = file.async('text').then((text) => {
      try {
        const lib = JSON.parse(text)
        const libName = `${lib.machineName} ${lib.majorVersion}.${lib.minorVersion}`
        libraries.set(libName, lib)
      } catch {
        // Ignore invalid JSON
      }
    })
    promises.push(promise)
  })
  
  await Promise.all(promises)
  return libraries
}

/**
 * Get a media URL from the package
 */
export function getMediaUrl(pkg: H5PPackage, path: string): string | undefined {
  // Try direct path first
  if (pkg.media.has(path)) {
    return pkg.media.get(path)
  }
  
  // Try without leading directories
  const filename = path.split('/').pop()
  if (filename) {
    for (const [key, url] of pkg.media.entries()) {
      if (key.endsWith(filename)) {
        return url
      }
    }
  }
  
  return undefined
}

/**
 * Clean up blob URLs when package is no longer needed
 */
export function releasePackage(pkg: H5PPackage): void {
  for (const url of pkg.media.values()) {
    URL.revokeObjectURL(url)
  }
  pkg.media.clear()
}

