import type { FormEvent } from 'react'
import type { CategorySummary } from '../../lib/api'
import { CategoryInlineCreator } from '../CategoryInlineCreator'
import { AutosizeTextarea } from '../common/AutosizeTextarea'
import { uiTokens } from '../../lib/uiTokens'

type ThreadEditorLabels = {
  save: string
  saving?: string
  cancel: string
  categoryPlaceholder: string
  addCategory: string
  cancelCategory: string
}

type ThreadEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  categories: CategorySummary[]
  selectedCategories: string[]
  editingCategoryInput: string
  isAddingCategory: boolean
  isCreateCategoryPending: boolean
  isSaving: boolean
  buttonSize?: 'sm' | 'md'
  onToggleCategory: (name: string) => void
  onCategoryInputChange: (value: string) => void
  onCategoryOpen: () => void
  onCategoryCancel: () => void
  onCategorySubmit: () => void
  labels: ThreadEditorLabels
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

export function ThreadEditor({
  value,
  onChange,
  onSave,
  onCancel,
  categories,
  selectedCategories,
  editingCategoryInput,
  isAddingCategory,
  isCreateCategoryPending,
  isSaving,
  buttonSize = 'sm',
  onToggleCategory,
  onCategoryInputChange,
  onCategoryOpen,
  onCategoryCancel,
  onCategorySubmit,
  labels,
  handleTextareaInput,
  resizeTextarea,
}: ThreadEditorProps) {
  const availableCategories = categories.filter(
    (category) => !selectedCategories.includes(category.name),
  )
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
        className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={value}
        onChange={onChange}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
      />
      <div className="mt-4 py-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {availableCategories.map((category) => (
              <button
                key={category.id}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700"
                type="button"
                onClick={() => onToggleCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
            <div className="flex items-center">
              <CategoryInlineCreator
                isOpen={isAddingCategory}
                value={editingCategoryInput}
                placeholder={labels.categoryPlaceholder}
                addLabel={labels.addCategory}
                cancelLabel={labels.cancelCategory}
                disabled={isCreateCategoryPending}
                onOpen={onCategoryOpen}
                onValueChange={onCategoryInputChange}
                onSubmit={onCategorySubmit}
                onCancel={onCategoryCancel}
              />
            </div>
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
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  )
}
