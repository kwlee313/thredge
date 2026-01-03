import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import type { FormEvent } from 'react'
import type { CategorySummary, ThreadDetail } from '../../lib/api'
import { highlightMatches } from '../../lib/highlightMatches'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../../lib/threadText'
import { isMutedText, stripMutedText } from '../../lib/mutedText'
import { EntryCard } from './EntryCard'
import { ThreadCardHeader } from './ThreadCardHeader'
import { ThreadEditor } from './ThreadEditor'

type ThreadCardData = {
  thread: ThreadDetail
  theme: { card: string; entry: string }
  categories: CategorySummary[]
  normalizedSearchQuery: string
  entryDepth: Map<string, number>
  linkTo: string
}

type ThreadCardUi = {
  isEditing: boolean
  editingThreadBody: string
  editingThreadCategories: string[]
  editingCategoryInput: string
  isAddingEditingCategory: boolean
  editingEntryId: string | null
  editingEntryBody: string
  activeReplyId: string | null
  replyDrafts: Record<string, string>
  newEntryDraft: string
  isUpdateThreadPending: boolean
  isCreateCategoryPending: boolean
  isPinPending: boolean
  isUnpinPending: boolean
  isHidePending: boolean
  isEntryUpdatePending: boolean
  isEntryHidePending: boolean
  isEntryToggleMutePending: boolean
  isReplyPending: boolean
  isAddEntryPending: boolean
}

type ThreadCardActions = {
  onStartEdit: () => void
  onCancelEdit: () => void
  onEditingThreadBodyChange: (value: string) => void
  onEditingCategoryToggle: (name: string) => void
  onEditingCategoryInputChange: (value: string) => void
  onEditingCategoryOpen: () => void
  onEditingCategoryCancel: () => void
  onEditingCategorySubmit: () => void
  onSaveEdit: () => void
  onTogglePin: () => void
  onToggleMute: () => void
  onHide: () => void
  onEntryEditStart: (entryId: string, body: string) => void
  onEntryEditChange: (value: string) => void
  onEntryEditCancel: () => void
  onEntryEditSave: (entryId: string) => void
  onEntryToggleMute: (entryId: string, body: string) => void
  onEntryHide: (entryId: string) => void
  onReplyStart: (entryId: string) => void
  onReplyChange: (entryId: string, value: string) => void
  onReplyCancel: () => void
  onReplySubmit: (entryId: string) => void
  onNewEntryChange: (value: string) => void
  onNewEntrySubmit: () => void
}

type ThreadCardHelpers = {
  t: (key: string, options?: Record<string, unknown>) => string
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

type ThreadCardProps = {
  data: ThreadCardData
  ui: ThreadCardUi
  actions: ThreadCardActions
  helpers: ThreadCardHelpers
}

export function ThreadCard({ data, ui, actions, helpers }: ThreadCardProps) {
  const {
    thread,
    theme,
    categories,
    normalizedSearchQuery,
    entryDepth,
    linkTo,
  } = data
  const {
    isEditing,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
    isAddingEditingCategory,
    editingEntryId,
    editingEntryBody,
    activeReplyId,
    replyDrafts,
    newEntryDraft,
    isUpdateThreadPending,
    isCreateCategoryPending,
    isPinPending,
    isUnpinPending,
    isHidePending,
    isEntryUpdatePending,
    isEntryHidePending,
    isEntryToggleMutePending,
    isReplyPending,
    isAddEntryPending,
  } = ui
  const {
    onStartEdit,
    onCancelEdit,
    onEditingThreadBodyChange,
    onEditingCategoryToggle,
    onEditingCategoryInputChange,
    onEditingCategoryOpen,
    onEditingCategoryCancel,
    onEditingCategorySubmit,
    onSaveEdit,
    onTogglePin,
    onToggleMute,
    onHide,
    onEntryEditStart,
    onEntryEditChange,
    onEntryEditCancel,
    onEntryEditSave,
    onEntryToggleMute,
    onEntryHide,
    onReplyStart,
    onReplyChange,
    onReplyCancel,
    onReplySubmit,
    onNewEntryChange,
    onNewEntrySubmit,
  } = actions
  const { t, handleTextareaInput, resizeTextarea } = helpers
  const isThreadBodyMuted = isMutedText(thread.body)
  const rawBody = thread.body ? (isThreadBodyMuted ? stripMutedText(thread.body) : thread.body) : null
  const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : thread.title

  return (
    <div
      className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${theme.card}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-gray-100" />
      <ThreadCardHeader
        thread={thread}
        isEditing={isEditing}
        editingThreadCategories={editingThreadCategories}
        isPinPending={isPinPending}
        isUnpinPending={isUnpinPending}
        isHidePending={isHidePending}
        labels={{
          pin: t('home.pin'),
          unpin: t('home.unpin'),
          edit: t('home.edit'),
          archive: t('home.archive'),
        }}
        onTogglePin={onTogglePin}
        onStartEdit={onStartEdit}
        onToggleMute={onToggleMute}
        onHide={onHide}
        onEditingCategoryToggle={onEditingCategoryToggle}
      />
      <div className="mt-6 pl-3 text-sm font-semibold">
        {isEditing ? (
          <span className={isThreadBodyMuted ? 'text-gray-400 line-through' : 'text-gray-900'}>
            {highlightMatches(displayTitle, normalizedSearchQuery)}
          </span>
        ) : (
          <Link
            className={`hover:underline ${
              isThreadBodyMuted ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
            to={linkTo}
          >
            {highlightMatches(displayTitle, normalizedSearchQuery)}
          </Link>
        )}
      </div>
      {isEditing ? (
        <ThreadEditor
          value={editingThreadBody}
          onChange={onEditingThreadBodyChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          categories={categories}
          selectedCategories={editingThreadCategories}
          editingCategoryInput={editingCategoryInput}
          isAddingCategory={isAddingEditingCategory}
          isCreateCategoryPending={isCreateCategoryPending}
          isSaving={isUpdateThreadPending}
          onToggleCategory={onEditingCategoryToggle}
          onCategoryInputChange={onEditingCategoryInputChange}
          onCategoryOpen={onEditingCategoryOpen}
          onCategoryCancel={onEditingCategoryCancel}
          onCategorySubmit={onEditingCategorySubmit}
          labels={{
            save: t('home.save'),
            cancel: t('home.cancel'),
            categoryPlaceholder: t('home.categoryPlaceholder'),
            addCategory: t('home.addCategory'),
            cancelCategory: t('home.cancel'),
          }}
          handleTextareaInput={handleTextareaInput}
          resizeTextarea={resizeTextarea}
        />
      ) : (
        thread.body &&
        (() => {
          const normalizedBody =
            thread.body && isThreadBodyMuted ? stripMutedText(thread.body) : thread.body
          const body = normalizedBody ? getBodyWithoutTitle(displayTitle, normalizedBody) : ''
          return body ? (
            <p
              className={`mt-2 whitespace-pre-wrap text-sm ${
                isThreadBodyMuted ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}
            >
              {highlightMatches(body, normalizedSearchQuery)}
            </p>
          ) : null
        })()
      )}
      <div className="mt-2 space-y-2 sm:mt-6">
        {thread.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            depth={entryDepth.get(entry.id) ?? 1}
            themeEntryClass={theme.entry}
            highlightQuery={normalizedSearchQuery}
            isEditing={editingEntryId === entry.id}
            editingBody={editingEntryBody}
            isReplyActive={activeReplyId === entry.id}
            replyDraft={replyDrafts[entry.id] ?? ''}
            isEntryUpdatePending={isEntryUpdatePending}
            isEntryHidePending={isEntryHidePending}
            isEntryToggleMutePending={isEntryToggleMutePending}
            isReplyPending={isReplyPending}
            onEditStart={() => onEntryEditStart(entry.id, entry.body)}
            onEditChange={onEntryEditChange}
            onEditCancel={onEntryEditCancel}
            onEditSave={() => onEntryEditSave(entry.id)}
            onToggleMute={(nextBody) => onEntryToggleMute(entry.id, nextBody)}
            onHide={() => onEntryHide(entry.id)}
            onReplyStart={() => onReplyStart(entry.id)}
            onReplyChange={(value) => onReplyChange(entry.id, value)}
            onReplyCancel={onReplyCancel}
            onReplySubmit={() => onReplySubmit(entry.id)}
            handleTextareaInput={handleTextareaInput}
            resizeTextarea={resizeTextarea}
          />
        ))}
      </div>
      <form
        className="mt-2 space-y-2 sm:mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!newEntryDraft.trim()) {
            return
          }
          onNewEntrySubmit()
        }}
      >
        <textarea
          className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder={t('home.entryPlaceholder')}
          value={newEntryDraft}
          onChange={(event) => onNewEntryChange(event.target.value)}
          onInput={handleTextareaInput}
          data-autoresize="true"
          ref={(element) => resizeTextarea(element)}
        />
        <button
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          type="submit"
          disabled={isAddEntryPending}
        >
          {isAddEntryPending ? t('home.loading') : t('home.addEntry')}
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-500 sm:mt-4">
        {t('home.lastActivity', {
          time: formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true }),
        })}
      </div>
    </div>
  )
}
