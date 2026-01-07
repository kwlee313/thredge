import { useEffect, useRef, type FormEvent } from 'react'
import { useTextareaAutosize } from '../../hooks/useTextareaAutosize'

type AutosizeTextareaProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className: string
  inputRef?: (element: HTMLTextAreaElement | null) => void
  onInput?: (event: FormEvent<HTMLTextAreaElement>) => void
}

export function AutosizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
  onInput,
}: AutosizeTextareaProps) {
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize()
  const internalRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    resizeTextarea(internalRef.current)
  }, [value, resizeTextarea])

  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onInput={(e) => {
        handleTextareaInput(e)
        onInput?.(e)
      }}
      data-autoresize="true"
      ref={(element) => {
        resizeTextarea(element)
        internalRef.current = element
        inputRef?.(element)
      }}
    />
  )
}
