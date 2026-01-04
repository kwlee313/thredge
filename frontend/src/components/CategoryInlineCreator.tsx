import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

type CategoryInlineCreatorProps = {
  isOpen: boolean
  value: string
  placeholder: string
  addLabel: string
  cancelLabel: string
  disabled?: boolean
  onOpen: () => void
  onValueChange: (next: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function CategoryInlineCreator({
  isOpen,
  value,
  placeholder,
  addLabel,
  cancelLabel,
  disabled,
  onOpen,
  onValueChange,
  onSubmit,
  onCancel,
}: CategoryInlineCreatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      onSubmit()
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      onCancel()
    }
  }

  if (!isOpen) {
    return (
      <button
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--theme-border)] text-xs font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
        type="button"
        onClick={onOpen}
      >
        +
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        className="w-44 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1 text-xs text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        disabled={disabled}
      />
      <button
        className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
        type="button"
        onClick={onSubmit}
        disabled={disabled}
      >
        {addLabel}
      </button>
      <button
        className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
        type="button"
        onClick={onCancel}
        disabled={disabled}
      >
        {cancelLabel}
      </button>
    </div>
  )
}
