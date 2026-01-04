import { useEffect, useRef, type FormEvent } from 'react'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type ReplyComposerProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
  labels: {
    submit: string
    cancel: string
  }
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
  focusId?: string
  activeFocusId?: string | null
  onFocusHandled?: () => void
}

export function ReplyComposer({
  value,
  placeholder,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  labels,
  handleTextareaInput,
  resizeTextarea,
  focusId,
  activeFocusId,
  onFocusHandled,
}: ReplyComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!focusId || focusId !== activeFocusId) {
      return
    }
    const element = textareaRef.current
    element?.focus({ preventScroll: true })
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    onFocusHandled?.()
  }, [activeFocusId, focusId, onFocusHandled])

  return (
    <form
      className="mt-1 space-y-2 sm:mt-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) {
          return
        }
        onSubmit()
      }}
    >
      <AutosizeTextarea
        className="min-h-[64px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
        inputRef={(element) => {
          textareaRef.current = element
        }}
      />
      <div className="flex items-center gap-2">
        <button
          className={uiTokens.button.primaryXs}
          type="submit"
          disabled={isSubmitting}
        >
          {labels.submit}
        </button>
        <button
          className={uiTokens.button.secondaryXs}
          type="button"
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  )
}
