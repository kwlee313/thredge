import type { FormEvent } from 'react'
import type { CategorySummary, EntryDetail } from '../../lib/api'

export type EntryCardData = {
  entry: EntryDetail
  depth: number
  themeEntryClass: string
  highlightQuery: string
}

export type EntryCardUi = {
  showMoveControls?: boolean
  isEditing: boolean
  editingBody: string
  isReplyActive: boolean
  replyDraft: string
  isEntryUpdatePending: boolean
  isEntryHidePending: boolean
  isEntryToggleMutePending: boolean
  isEntryMovePending: boolean
  isMoveUpDisabled: boolean
  isMoveDownDisabled: boolean
  isReplyPending: boolean
  replyComposerFocusId?: string | null
  onReplyComposerFocusHandled?: () => void
}

export type EntryCardActions = {
  onEditStart: () => void
  onEditChange: (value: string) => void
  onEditCancel: () => void
  onEditSave: () => void
  onToggleMute: (nextBody: string) => void
  onHide: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onReplyStart: () => void
  onReplyChange: (value: string) => void
  onReplyCancel: () => void
  onReplySubmit: () => void
}

export type EntryCardHelpers = {
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

export type ThreadEditorLabels = {
  save: string
  saving?: string
  cancel: string
  categorySearchPlaceholder: string
  addCategory: string
  cancelCategory: string
  loadMore: string
}

export type ThreadEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  categories: CategorySummary[]
  selectedCategories: string[]
  editingCategoryInput: string
  isCreateCategoryPending: boolean
  isSaving: boolean
  buttonSize?: 'sm' | 'md'
  onToggleCategory: (name: string) => void
  onCategoryInputChange: (value: string) => void
  onCategoryCancel: () => void
  onCategorySubmit: () => void
  labels: ThreadEditorLabels
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}
