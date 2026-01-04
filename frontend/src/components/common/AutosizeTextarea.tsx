import type { FormEvent } from 'react'

type AutosizeTextareaProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className: string
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
  inputRef?: (element: HTMLTextAreaElement | null) => void
}

export function AutosizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  handleTextareaInput,
  resizeTextarea,
  inputRef,
}: AutosizeTextareaProps) {
  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onInput={handleTextareaInput}
      data-autoresize="true"
      ref={(element) => {
        resizeTextarea(element)
        inputRef?.(element)
      }}
    />
  )
}
