import type { ReactNode } from 'react'

// URL regex: stops before <, >, whitespace, or end of string
const URL_REGEX = /(https?:\/\/[^\s<>]+)/g

// Internal helper for highlighting only
const applyHighlighting = (text: string, query: string): ReactNode => {
  if (!query) return text
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()
  if (!normalizedQuery) return text

  const parts: ReactNode[] = []
  let startIndex = 0
  let matchIndex = normalizedText.indexOf(normalizedQuery, startIndex)

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push(text.slice(startIndex, matchIndex))
    }
    const matchText = text.slice(matchIndex, matchIndex + normalizedQuery.length)
    parts.push(
      <mark key={`${startIndex}-${matchIndex}`} className="rounded bg-yellow-200 px-0.5">
        {matchText}
      </mark>,
    )
    startIndex = matchIndex + normalizedQuery.length
    matchIndex = normalizedText.indexOf(normalizedQuery, startIndex)
  }
  if (startIndex < text.length) {
    parts.push(text.slice(startIndex))
  }
  return parts
}

type HighlightOptions = {
  disableLinks?: boolean
}

export const highlightMatches = (
  text: string,
  query: string,
  options?: HighlightOptions,
): ReactNode => {
  // Linkify URLs that aren't already inside <a> tags
  const linkifiedText = text.replace(
    /(<a\s[^>]*>.*?<\/a>)|(https?:\/\/[^\s<>]+)/gi,
    (_match, existingAnchor, url) => {
      if (existingAnchor) return existingAnchor // Already wrapped, keep as-is
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all" onclick="event.stopPropagation()">${url}</a>`
    },
  )

  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(linkifiedText)
  if (hasHtmlTags) {
    return <span dangerouslySetInnerHTML={{ __html: linkifiedText }} />
  }

  if (options?.disableLinks) {
    return applyHighlighting(text, query)
  }

  // For plain text without HTML, use React components for better highlighting
  const parts = text.split(URL_REGEX)

  if (parts.length === 1) {
    return applyHighlighting(text, query)
  }

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0 // Reset regex state
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {applyHighlighting(part, query)}
        </a>
      )
    }
    return <span key={index}>{applyHighlighting(part, query)}</span>
  })
}
