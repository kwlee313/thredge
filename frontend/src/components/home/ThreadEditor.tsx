import { useEffect, useMemo, useState } from 'react'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'
import type { ThreadEditorProps } from './types'

export function ThreadEditor({
  value,
  onChange,
  onSave,
  onCancel,
  onComplete,
  categories,
  selectedCategories,
  editingCategoryInput,
  isCreateCategoryPending,
  isSaving,
  buttonSize = 'sm',
  onToggleCategory,
  onCategoryInputChange,
  onCategoryCancel,
  onCategorySubmit,
  labels,
}: ThreadEditorProps) {
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0)
  const [isCategoryInputFocused, setIsCategoryInputFocused] = useState(false)
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false)
  const categoryPreviewLimit = 10
  const trimmedCategoryInput = editingCategoryInput.trim()
  const normalizedCategoryInput = trimmedCategoryInput.toLowerCase()
  const matchingCategories = useMemo(() => {
    if (!normalizedCategoryInput) {
      return categories
    }
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedCategoryInput),
    )
  }, [categories, normalizedCategoryInput])
  const hasExactCategoryMatch = useMemo(() => {
    if (!normalizedCategoryInput) {
      return false
    }
    return categories.some(
      (category) => category.name.toLowerCase() === normalizedCategoryInput,
    )
  }, [categories, normalizedCategoryInput])
  const availableCategories = matchingCategories.filter(
    (category) => !selectedCategories.includes(category.name),
  )
  const visibleCategories =
    isCategoryInputFocused || isCategoryListExpanded
      ? availableCategories
      : availableCategories.slice(0, categoryPreviewLimit)
  const shouldShowCategoryExpand =
    !isCategoryInputFocused &&
    !isCategoryListExpanded &&
    availableCategories.length > categoryPreviewLimit
  const shouldShowCreate = Boolean(normalizedCategoryInput) && !hasExactCategoryMatch

  useEffect(() => {
    if (availableCategories.length === 0) {
      setFocusedCategoryIndex(0)
      return
    }
    setFocusedCategoryIndex((prev) =>
      Math.max(0, Math.min(prev, availableCategories.length - 1)),
    )
  }, [availableCategories])
  const primaryButtonClass =
    buttonSize === 'md' ? uiTokens.button.primaryMd : uiTokens.button.primarySm
  const secondaryButtonClass =
    buttonSize === 'md' ? uiTokens.button.secondaryMd : uiTokens.button.secondarySm

  return (
    <form
      className="mt-2 space-y-2 sm:mt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) {
          return
        }
        onSave()
      }}
    >
      <AutosizeTextarea
        className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
        value={value}
        onChange={onChange}
      />
      <div className="mt-4 py-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-[110px] rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
              placeholder={labels.categorySearchPlaceholder}
              value={editingCategoryInput}
              onFocus={() => {
                setIsCategoryInputFocused(true)
                if (availableCategories.length > 0) {
                  setFocusedCategoryIndex(0)
                }
              }}
              onBlur={() => setIsCategoryInputFocused(false)}
              onChange={(event) => {
                setIsCategoryListExpanded(false)
                onCategoryInputChange(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault()
                  setFocusedCategoryIndex((prev) =>
                    availableCategories.length === 0
                      ? 0
                      : (prev + 1) % availableCategories.length,
                  )
                  return
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault()
                  setFocusedCategoryIndex((prev) =>
                    availableCategories.length === 0
                      ? 0
                      : (prev - 1 + availableCategories.length) % availableCategories.length,
                  )
                  return
                }
                if (event.key !== 'Enter') {
                  return
                }
                const match = availableCategories[focusedCategoryIndex]
                if (!match) {
                  return
                }
                event.preventDefault()
                onToggleCategory(match.name)
                if (normalizedCategoryInput) {
                  onCategoryInputChange('')
                }
              }}
            />
            {visibleCategories.map((category, index) => (
              <button
                key={category.id}
                className={`rounded-full border border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-ink)] ${focusedCategoryIndex === index
                  ? 'outline outline-2 outline-[var(--theme-primary)] outline-offset-1'
                  : ''
                  }`}
                type="button"
                tabIndex={-1}
                onClick={() => onToggleCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
            {shouldShowCategoryExpand && (
              <button
                className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                type="button"
                onClick={() => setIsCategoryListExpanded(true)}
              >
                ... {labels.loadMore}
              </button>
            )}
            {shouldShowCreate && (
              <div className="flex items-center gap-1">
                <button
                  className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                  type="button"
                  onClick={onCategorySubmit}
                  disabled={isCreateCategoryPending}
                >
                  '{trimmedCategoryInput}' {labels.addCategory}
                </button>
                <button
                  className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                  type="button"
                  onClick={onCategoryCancel}
                  disabled={isCreateCategoryPending}
                >
                  {labels.cancelCategory}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={primaryButtonClass}
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? labels.saving ?? labels.save : labels.save}
        </button>
        <button
          className={secondaryButtonClass}
          type="button"
          onClick={onComplete}
        >
          {labels.complete}
        </button>
        <button
          className={secondaryButtonClass}
          type="button"
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  )
}
