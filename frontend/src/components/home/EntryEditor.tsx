import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type EntryEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onComplete: () => void
  isSaving: boolean
  isCompletePending?: boolean
  labels: {
    save: string
    cancel: string
    complete: string
  }
}

export function EntryEditor({
  value,
  onChange,
  onSave,
  onCancel,
  onComplete,
  isSaving,
  isCompletePending,
  labels,
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
        className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
        value={value}
        onChange={onChange}
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
          onClick={onComplete}
          disabled={isCompletePending}
        >
          {labels.complete}
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
