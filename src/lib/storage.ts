import { get, set, del, keys } from 'idb-keyval'
import JSZip from 'jszip'
import type { SemanticPackage } from './semantic/schema'

const PACKAGE_PREFIX = 'h5p-package-'
const RECENT_KEY = 'h5p-recent-packages'

export interface StoredPackage {
  id: string
  title: string
  savedAt: string
  semanticJson: SemanticPackage
}

export interface RecentPackage {
  id: string
  title: string
  savedAt: string
}

/**
 * Save a package to IndexedDB
 */
export async function savePackage(semanticJson: SemanticPackage): Promise<void> {
  const stored: StoredPackage = {
    id: semanticJson.id,
    title: semanticJson.title,
    savedAt: new Date().toISOString(),
    semanticJson,
  }
  
  await set(`${PACKAGE_PREFIX}${semanticJson.id}`, stored)
  await updateRecent(stored)
}

/**
 * Load a package from IndexedDB
 */
export async function loadPackage(id: string): Promise<StoredPackage | null> {
  const stored = await get<StoredPackage>(`${PACKAGE_PREFIX}${id}`)
  return stored || null
}

/**
 * Delete a package from IndexedDB
 */
export async function deletePackage(id: string): Promise<void> {
  await del(`${PACKAGE_PREFIX}${id}`)
  
  // Update recent list
  const recent = await getRecentPackages()
  const filtered = recent.filter(p => p.id !== id)
  await set(RECENT_KEY, filtered)
}

/**
 * Get list of recent packages
 */
export async function getRecentPackages(): Promise<RecentPackage[]> {
  const recent = await get<RecentPackage[]>(RECENT_KEY)
  return recent || []
}

/**
 * Update the recent packages list
 */
async function updateRecent(pkg: StoredPackage): Promise<void> {
  const recent = await getRecentPackages()
  
  // Remove if already exists
  const filtered = recent.filter(p => p.id !== pkg.id)
  
  // Add to front
  filtered.unshift({
    id: pkg.id,
    title: pkg.title,
    savedAt: pkg.savedAt,
  })
  
  // Keep only last 10
  const trimmed = filtered.slice(0, 10)
  
  await set(RECENT_KEY, trimmed)
}

/**
 * List all saved packages
 */
export async function listPackages(): Promise<RecentPackage[]> {
  const allKeys = await keys()
  const packageKeys = allKeys.filter(k => 
    typeof k === 'string' && k.startsWith(PACKAGE_PREFIX)
  )
  
  const packages: RecentPackage[] = []
  
  for (const key of packageKeys) {
    const stored = await get<StoredPackage>(key as string)
    if (stored) {
      packages.push({
        id: stored.id,
        title: stored.title,
        savedAt: stored.savedAt,
      })
    }
  }
  
  return packages.sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

/**
 * Export semantic JSON as downloadable file
 */
export function downloadSemanticJson(semanticJson: SemanticPackage): void {
  const blob = new Blob([JSON.stringify(semanticJson, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${semanticJson.id || 'semantic'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

/**
 * Export as ZIP bundle with semantic JSON and all media assets
 */
export async function downloadZipBundle(
  semanticJson: SemanticPackage,
  mediaBlobs: Map<string, Blob>
): Promise<void> {
  const zip = new JSZip()
  
  // Add semantic JSON
  zip.file('semantic.json', JSON.stringify(semanticJson, null, 2))
  
  // Create media folder structure
  const mediaFolder = zip.folder('media')
  if (!mediaFolder) throw new Error('Failed to create media folder')
  
  // Add images
  const imagesFolder = mediaFolder.folder('images')
  if (imagesFolder) {
    for (const image of semanticJson.media.images) {
      const blob = mediaBlobs.get(image.path)
      if (blob) {
        const filename = image.path.split('/').pop() || `image-${image.id}.png`
        imagesFolder.file(filename, blob)
      }
    }
  }
  
  // Add videos
  const videosFolder = mediaFolder.folder('videos')
  if (videosFolder) {
    for (const video of semanticJson.media.videos) {
      if (!video.isExternal) {
        const blob = mediaBlobs.get(video.path)
        if (blob) {
          const filename = video.path.split('/').pop() || `video-${video.id}.mp4`
          videosFolder.file(filename, blob)
        }
      }
    }
  }
  
  // Add audio
  const audioFolder = mediaFolder.folder('audio')
  if (audioFolder) {
    for (const audio of semanticJson.media.audio) {
      const blob = mediaBlobs.get(audio.path)
      if (blob) {
        const filename = audio.path.split('/').pop() || `audio-${audio.id}.mp3`
        audioFolder.file(filename, blob)
      }
    }
  }
  
  // Create README with structure summary
  const readme = generateReadme(semanticJson)
  zip.file('README.md', readme)
  
  // Generate and download ZIP
  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${semanticJson.id || 'h5p-export'}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate a README summarizing the content structure
 */
function generateReadme(semanticJson: SemanticPackage): string {
  const lines: string[] = [
    `# ${semanticJson.title}`,
    '',
    `**Content Type:** ${semanticJson.contentType}`,
    `**Language:** ${semanticJson.language}`,
    `**Exported:** ${new Date().toISOString()}`,
    '',
    '## Structure',
    '',
  ]
  
  // Iterate over H1 (section) nodes
  for (const section of semanticJson.structure.children) {
    if (section.headingLevel !== 1) continue
    const sectionTypeLabel = section.sectionType ? ` (${section.sectionType})` : ''
    lines.push(`### ${section.title}${sectionTypeLabel}`)
    lines.push('')
    
    // Iterate over H2 (slide) nodes
    for (const slide of (section.children || [])) {
      if (slide.headingLevel !== 2) continue
      const slideTypeLabel = slide.sectionType ? ` [${slide.sectionType}]` : ''
      lines.push(`- **${slide.title}**${slideTypeLabel}`)
      
      // Summarize child content nodes
      const contentTypes = (slide.children || []).reduce((acc: Record<string, number>, node) => {
        const type = node.contentType || (node.headingLevel ? `h${node.headingLevel}` : 'content')
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
      
      const contentSummary = Object.entries(contentTypes)
        .map(([type, count]) => `${count} ${type}${(count as number) > 1 ? 's' : ''}`)
        .join(', ')
      
      if (contentSummary) {
        lines.push(`  - Content: ${contentSummary}`)
      }
    }
    lines.push('')
  }
  
  // Media summary
  lines.push('## Media Assets')
  lines.push('')
  lines.push(`- **Images:** ${semanticJson.media.images.length}`)
  lines.push(`- **Videos:** ${semanticJson.media.videos.length}`)
  lines.push(`- **Audio:** ${semanticJson.media.audio.length}`)
  lines.push('')
  
  // Interactive elements
  if (semanticJson.interactives.length > 0) {
    lines.push('## Interactive Elements')
    lines.push('')
    
    const interactiveTypes = semanticJson.interactives.reduce((acc, int) => {
      acc[int.type] = (acc[int.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    for (const [type, count] of Object.entries(interactiveTypes)) {
      lines.push(`- **${type}:** ${count}`)
    }
    lines.push('')
  }
  
  lines.push('## Files')
  lines.push('')
  lines.push('- `semantic.json` - Full semantic representation of the content')
  lines.push('- `media/images/` - Image assets')
  lines.push('- `media/videos/` - Video assets (external videos are linked, not included)')
  lines.push('- `media/audio/` - Audio assets')
  lines.push('')
  
  return lines.join('\n')
}

/**
 * Export as H5P package (re-pack as ZIP)
 * Note: This is a simplified version - a full implementation would
 * reconstruct the complete H5P structure
 */
export async function downloadH5PPackage(
  semanticJson: SemanticPackage,
  mediaBlobs: Map<string, Blob>
): Promise<void> {
  // Use the ZIP bundle export
  await downloadZipBundle(semanticJson, mediaBlobs)
}

