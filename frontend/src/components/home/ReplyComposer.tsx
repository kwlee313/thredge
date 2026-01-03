import type { FormEvent } from 'react'
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
}: ReplyComposerProps) {
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
        className="min-h-[64px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
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
