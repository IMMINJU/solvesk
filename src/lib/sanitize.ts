import sanitize from 'sanitize-html'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'hr',
  'code',
  'pre',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'span',
]

const ALLOWED_ATTR: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  '*': ['class', 'data-type', 'data-checked'],
}

/**
 * Sanitize HTML content from TiptapEditor before storage.
 * Strips dangerous tags/attributes (script, onclick, etc.) while
 * preserving rich-text formatting.
 */
export function sanitizeHtml(content: string): string {
  return sanitize(content, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
  })
}
