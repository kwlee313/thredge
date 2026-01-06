import { useCallback, useEffect } from 'react'
import type { FormEvent } from 'react'

type Options = {
  maxHeight?: number
  deps?: unknown[]
}

export const useTextareaAutosize = (options: Options = {}) => {
  const { maxHeight = 800, deps = [] } = options
  const resizeTextarea = useCallback(
    (element: HTMLTextAreaElement | null) => {
      if (!element) {
        return
      }
      element.style.height = 'auto'
      const nextHeight = Math.min(element.scrollHeight, maxHeight)
      element.style.height = `${nextHeight}px`
      element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden'
    },
    [maxHeight],
  )

  const handleTextareaInput = useCallback(
    (event: FormEvent<HTMLTextAreaElement>) => {
      resizeTextarea(event.currentTarget)
    },
    [resizeTextarea],
  )

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLTextAreaElement>('textarea[data-autoresize="true"]')
        .forEach((element) => resizeTextarea(element))
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [resizeTextarea, ...deps])

  return { handleTextareaInput, resizeTextarea }
}
