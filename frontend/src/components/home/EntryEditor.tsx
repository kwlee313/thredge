import type { FormEvent } from 'react'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type EntryEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  labels: {
    save: string
    cancel: string
  }
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

export function EntryEditor({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
  labels,
  handleTextareaInput,
  resizeTextarea,
}: EntryEditorProps) {
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) {
          return
        }
        onSave()
      }}
    >
      <AutosizeTextarea
        className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={value}
        onChange={onChange}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
      />
      <div className="flex items-center gap-2">
        <button
          className={uiTokens.button.primaryXs}
          type="submit"
          disabled={isSaving}
        >
          {labels.save}
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
