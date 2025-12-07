/**
 * HTML to Semantic Markdown Converter
 * 
 * Converts HTML content to clean semantic Markdown, focusing on:
 * - Heading levels (h1-h6 → # syntax)
 * - Lists (ul/ol → - and 1. syntax)
 * - Tables (table → Markdown table syntax)
 * - Basic formatting (bold, italic) with smart stripping
 * - Preserving only essential HTML (iframes, etc.)
 */

/**
 * Convert HTML string to semantic Markdown
 */
export function htmlToMarkdown(html: string, options: ConversionOptions = {}): string {
  if (!html || !html.trim()) return ''
  
  const { isHeading = false, headingLevel } = options
  
  // Parse HTML using DOMParser
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild as HTMLElement
  
  if (!root) return html.trim()
  
  // Convert the DOM tree to Markdown
  let markdown = convertNode(root, { isTopLevel: true })
  
  // Clean up the result
  markdown = cleanupMarkdown(markdown)
  
  // If this is a heading, strip redundant formatting (bold/italic on entire text)
  if (isHeading) {
    markdown = stripRedundantHeadingFormatting(markdown)
  }
  
  // Add heading prefix if specified
  if (headingLevel && headingLevel >= 1 && headingLevel <= 6) {
    const prefix = '#'.repeat(headingLevel) + ' '
    // Only add if not already a heading
    if (!markdown.startsWith('#')) {
      markdown = prefix + markdown
    }
  }
  
  return markdown.trim()
}

interface ConversionOptions {
  isHeading?: boolean
  headingLevel?: number
}

interface ConversionContext {
  isTopLevel?: boolean
  inList?: boolean
  listType?: 'ul' | 'ol'
  listIndex?: number
  inTable?: boolean
  inBlockquote?: boolean
}

/**
 * Convert a DOM node to Markdown
 */
function convertNode(node: Node, ctx: ConversionContext = {}): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }
  
  const el = node as HTMLElement
  const tagName = el.tagName.toLowerCase()
  
  // Get children content
  const childrenMarkdown = () => {
    let result = ''
    for (const child of Array.from(el.childNodes)) {
      result += convertNode(child, ctx)
    }
    return result
  }
  
  switch (tagName) {
    // Container elements - just process children
    case 'div':
    case 'span':
    case 'p':
      const content = childrenMarkdown()
      // Add paragraph breaks for block elements
      if (tagName === 'p' || tagName === 'div') {
        return content + '\n\n'
      }
      return content
    
    // Headings
    case 'h1':
      return '# ' + childrenMarkdown().trim() + '\n\n'
    case 'h2':
      return '## ' + childrenMarkdown().trim() + '\n\n'
    case 'h3':
      return '### ' + childrenMarkdown().trim() + '\n\n'
    case 'h4':
      return '#### ' + childrenMarkdown().trim() + '\n\n'
    case 'h5':
      return '##### ' + childrenMarkdown().trim() + '\n\n'
    case 'h6':
      return '###### ' + childrenMarkdown().trim() + '\n\n'
    
    // Bold
    case 'strong':
    case 'b':
      const boldContent = childrenMarkdown().trim()
      if (!boldContent) return ''
      return `**${boldContent}**`
    
    // Italic
    case 'em':
    case 'i':
      const italicContent = childrenMarkdown().trim()
      if (!italicContent) return ''
      return `*${italicContent}*`
    
    // Strikethrough
    case 's':
    case 'strike':
    case 'del':
      const strikeContent = childrenMarkdown().trim()
      if (!strikeContent) return ''
      return `~~${strikeContent}~~`
    
    // Code
    case 'code':
      return '`' + childrenMarkdown() + '`'
    
    case 'pre':
      return '\n```\n' + childrenMarkdown().trim() + '\n```\n\n'
    
    // Links
    case 'a':
      const href = el.getAttribute('href') || ''
      const linkText = childrenMarkdown().trim()
      if (!href) return linkText
      return `[${linkText}](${href})`
    
    // Images
    case 'img':
      const src = el.getAttribute('src') || ''
      const alt = el.getAttribute('alt') || ''
      return `![${alt}](${src})`
    
    // Line breaks
    case 'br':
      return '\n'
    
    case 'hr':
      return '\n---\n\n'
    
    // Lists
    case 'ul':
      return '\n' + convertList(el, 'ul') + '\n'
    
    case 'ol':
      return '\n' + convertList(el, 'ol') + '\n'
    
    case 'li':
      // Handled by convertList
      return childrenMarkdown()
    
    // Tables
    case 'table':
      return '\n' + convertTable(el) + '\n'
    
    // Blockquote
    case 'blockquote':
      const quoteContent = childrenMarkdown().trim()
      return '\n' + quoteContent.split('\n').map(line => '> ' + line).join('\n') + '\n\n'
    
    // Preserve iframes and other special elements as HTML
    case 'iframe':
    case 'video':
    case 'audio':
    case 'object':
    case 'embed':
      return '\n' + el.outerHTML + '\n\n'
    
    // Skip these formatting elements (font size, color, etc.)
    case 'font':
    case 'u': // underline - not semantic
    case 'sup':
    case 'sub':
      return childrenMarkdown()
    
    default:
      // For unknown elements, just process children
      return childrenMarkdown()
  }
}

/**
 * Convert a list (ul/ol) to Markdown
 */
function convertList(listEl: HTMLElement, type: 'ul' | 'ol', indent: number = 0): string {
  const items: string[] = []
  let index = 1
  
  for (const child of Array.from(listEl.children)) {
    if (child.tagName.toLowerCase() === 'li') {
      const prefix = type === 'ul' ? '- ' : `${index}. `
      const indentStr = '  '.repeat(indent)
      
      // Process li content, handling nested lists
      let itemContent = ''
      for (const liChild of Array.from(child.childNodes)) {
        if (liChild.nodeType === Node.ELEMENT_NODE) {
          const liChildEl = liChild as HTMLElement
          const tag = liChildEl.tagName.toLowerCase()
          if (tag === 'ul' || tag === 'ol') {
            // Nested list
            itemContent += '\n' + convertList(liChildEl, tag as 'ul' | 'ol', indent + 1)
          } else {
            itemContent += convertNode(liChild, {})
          }
        } else {
          itemContent += convertNode(liChild, {})
        }
      }
      
      items.push(indentStr + prefix + itemContent.trim())
      index++
    }
  }
  
  return items.join('\n')
}

/**
 * Convert a table to Markdown
 */
function convertTable(tableEl: HTMLElement): string {
  const rows: string[][] = []
  let headerRowCount = 0
  
  // Process all rows
  const processRow = (tr: HTMLElement, isHeader: boolean) => {
    const cells: string[] = []
    for (const cell of Array.from(tr.children)) {
      if (cell.tagName.toLowerCase() === 'th' || cell.tagName.toLowerCase() === 'td') {
        let cellContent = ''
        for (const child of Array.from(cell.childNodes)) {
          cellContent += convertNode(child, {})
        }
        // Clean up cell content - no newlines in table cells
        cells.push(cellContent.replace(/\n/g, ' ').trim())
      }
    }
    if (cells.length > 0) {
      rows.push(cells)
      if (isHeader) headerRowCount++
    }
  }
  
  // Process thead
  const thead = tableEl.querySelector('thead')
  if (thead) {
    for (const tr of Array.from(thead.querySelectorAll('tr'))) {
      processRow(tr as HTMLElement, true)
    }
  }
  
  // Process tbody
  const tbody = tableEl.querySelector('tbody')
  if (tbody) {
    for (const tr of Array.from(tbody.querySelectorAll('tr'))) {
      processRow(tr as HTMLElement, false)
    }
  }
  
  // Process direct tr children (no thead/tbody)
  if (!thead && !tbody) {
    const trs = tableEl.querySelectorAll(':scope > tr')
    let isFirst = true
    for (const tr of Array.from(trs)) {
      // First row is treated as header if it contains th elements
      const hasHeaders = tr.querySelector('th') !== null
      processRow(tr as HTMLElement, isFirst && hasHeaders)
      isFirst = false
    }
  }
  
  if (rows.length === 0) return ''
  
  // Determine column count
  const colCount = Math.max(...rows.map(r => r.length))
  
  // Normalize rows to have same column count
  const normalizedRows = rows.map(row => {
    while (row.length < colCount) row.push('')
    return row
  })
  
  // Build Markdown table
  const lines: string[] = []
  
  // If no explicit header, use first row as header
  if (headerRowCount === 0 && normalizedRows.length > 0) {
    headerRowCount = 1
  }
  
  // Header row(s)
  for (let i = 0; i < headerRowCount && i < normalizedRows.length; i++) {
    lines.push('| ' + normalizedRows[i].join(' | ') + ' |')
  }
  
  // Separator
  if (normalizedRows.length > 0) {
    lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
  }
  
  // Data rows
  for (let i = headerRowCount; i < normalizedRows.length; i++) {
    lines.push('| ' + normalizedRows[i].join(' | ') + ' |')
  }
  
  return lines.join('\n')
}

/**
 * Strip redundant bold/italic formatting from headings
 * If the entire heading text is wrapped in bold or italic, remove it
 */
function stripRedundantHeadingFormatting(markdown: string): string {
  let result = markdown.trim()
  
  // Remove wrapping bold
  if (result.startsWith('**') && result.endsWith('**')) {
    const inner = result.slice(2, -2)
    // Only strip if there's no other ** inside
    if (!inner.includes('**')) {
      result = inner
    }
  }
  
  // Remove wrapping italic
  if (result.startsWith('*') && result.endsWith('*') && !result.startsWith('**')) {
    const inner = result.slice(1, -1)
    // Only strip if there's no other * inside
    if (!inner.includes('*')) {
      result = inner
    }
  }
  
  return result
}

/**
 * Clean up the Markdown output
 */
function cleanupMarkdown(markdown: string): string {
  let result = markdown
  
  // Remove excessive newlines (more than 2)
  result = result.replace(/\n{3,}/g, '\n\n')
  
  // Remove trailing whitespace from lines
  result = result.split('\n').map(line => line.trimEnd()).join('\n')
  
  // Remove leading/trailing whitespace
  result = result.trim()
  
  return result
}

/**
 * Convert Markdown back to simple HTML for preview
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return ''
  
  let html = markdown
  
  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')
  
  // But preserve already-escaped HTML elements (iframes, etc.)
  // Look for &lt;iframe and convert back
  html = html.replace(/&lt;(iframe|video|audio|object|embed)([^&]*?)&gt;/gi, '<$1$2>')
  html = html.replace(/&lt;\/(iframe|video|audio|object|embed)&gt;/gi, '</$1>')
  
  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
  
  // Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // Code blocks
  html = html.replace(/```\n?([\s\S]*?)\n?```/g, '<pre><code>$1</code></pre>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')
  
  // Lists (simple handling)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // Wrap consecutive li elements
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>)/g, '$1$2')
  
  // Tables (basic support)
  const tableRegex = /\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g
  html = html.replace(tableRegex, (_match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('')
    const bodyRows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('\n')
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  })
  
  // Paragraphs (wrap text blocks)
  const lines = html.split('\n\n')
  html = lines.map(block => {
    block = block.trim()
    if (!block) return ''
    // Don't wrap if already wrapped in block element
    if (/^<(h[1-6]|p|div|ul|ol|li|table|blockquote|pre|hr|iframe|video|audio)/i.test(block)) {
      return block
    }
    // Wrap in paragraph
    return `<p>${block.replace(/\n/g, '<br>')}</p>`
  }).join('\n')
  
  return html
}

/**
 * Extract plain text from Markdown
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return ''
  
  let text = markdown
  
  // Remove heading markers
  text = text.replace(/^#{1,6}\s+/gm, '')
  
  // Remove bold/italic markers
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/~~(.+?)~~/g, '$1')
  
  // Remove code markers
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/```[\s\S]*?```/g, '')
  
  // Extract link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  
  // Remove image syntax
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  
  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')
  
  // Remove blockquote markers
  text = text.replace(/^>\s+/gm, '')
  
  // Remove horizontal rules
  text = text.replace(/^---$/gm, '')
  
  // Remove table formatting
  text = text.replace(/\|/g, ' ')
  text = text.replace(/^[-| ]+$/gm, '')
  
  // Remove HTML tags (for preserved elements like iframes)
  text = text.replace(/<[^>]+>/g, '')
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()
  
  return text
}
