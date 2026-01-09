import type { CategorySummary, EntryDetail } from '../../lib/api'

export type EntryCardData = {
  entry: EntryDetail
  depth: number
  themeEntryClass: string
  highlightQuery: string
}

export type EntryDragState = {
  activeEntryId: string | null
  overEntryId: string | null
  overPosition: 'before' | 'after' | 'child' | null
}

export type EntryCardUi = {
  isEditing: boolean
  editingBody: string
  isReplyActive: boolean
  replyDraft: string
  isEntryUpdatePending: boolean
  isEntryHidePending: boolean
  isEntryToggleMutePending: boolean
  isEntryMovePending: boolean
  isReplyPending: boolean
  dragState?: EntryDragState
  replyComposerFocusId?: string | null
  onReplyComposerFocusHandled?: () => void
}

export type EntryCardActions = {
  onEditStart: () => void
  onEditChange: (value: string) => void
  onEditCancel: () => void
  onEditSave: (value?: string) => void
  onToggleMute: (nextBody: string) => void
  onHide: () => void
  onDragStart?: (entryId: string) => void
  onDragEnd?: () => void
  onReplyStart: () => void
  onReplyChange: (value: string) => void
  onReplyCancel: () => void
  onReplySubmit: (value: string) => void
}

export type EntryCardProps = {
  data: EntryCardData
  ui: EntryCardUi
  actions: EntryCardActions
}

export type ThreadEditorLabels = {
  save: string
  saving?: string
  cancel: string
  complete: string
  categorySearchPlaceholder: string
  addCategory: string
  cancelCategory: string
  loadMore: string
}

export type ThreadEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: (value: string) => void
  onCancel: () => void
  onComplete: () => void
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
}
