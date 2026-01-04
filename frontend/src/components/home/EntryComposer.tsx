import { useEffect, useRef, type FormEvent } from 'react'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type EntryComposerLabels = {
  submit: string
  submitting?: string
}

type EntryComposerProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  labels: EntryComposerLabels
  className?: string
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
  focusId?: string
  activeFocusId?: string | null
  onFocusHandled?: () => void
}

export function EntryComposer({
  value,
  placeholder,
  onChange,
  onSubmit,
  isSubmitting,
  labels,
  className = 'mt-2 space-y-2 sm:mt-4',
  handleTextareaInput,
  resizeTextarea,
  focusId,
  activeFocusId,
  onFocusHandled,
}: EntryComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!focusId || focusId !== activeFocusId) {
      return
    }
    if (!value.trim()) {
      const element = textareaRef.current
      element?.focus({ preventScroll: true })
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      onFocusHandled?.()
    }
  }, [activeFocusId, focusId, onFocusHandled, value])

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) {
          return
        }
        onSubmit()
      }}
    >
      <AutosizeTextarea
        className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
        inputRef={(element) => {
          textareaRef.current = element
        }}
      />
      <button
        className={uiTokens.button.primaryMd}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? labels.submitting ?? labels.submit : labels.submit}
      </button>
    </form>
  )
}
