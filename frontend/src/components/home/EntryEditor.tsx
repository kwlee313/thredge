import { useEffect, useState } from 'react'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type EntryEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: (value: string) => void
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
  value: initialValue,
  onChange,
  onSave,
  onCancel,
  onComplete,
  isSaving,
  isCompletePending,
  labels,
}: EntryEditorProps) {
  const [localValue, setLocalValue] = useState(initialValue)
  const debouncedValue = useDebouncedValue(localValue, 500)

  // Sync prop changes to local (in case of external updates)
  useEffect(() => {
    if (isSaving) {
      return
    }
    if (initialValue !== debouncedValue && initialValue !== localValue) {
      setLocalValue(initialValue)
    }
  }, [initialValue, isSaving])

  // Sync to parent (debounced) - only when stable
  useEffect(() => {
    if (debouncedValue === localValue && debouncedValue !== initialValue) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, initialValue, localValue])

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!localValue.trim()) {
          return
        }
        onSave(localValue)
      }}
    >
      <AutosizeTextarea
        className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
        value={localValue}
        onChange={setLocalValue}
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
