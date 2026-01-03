import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import type { FormEvent } from 'react'
import type { CategorySummary, ThreadDetail } from '../../lib/api'
import { highlightMatches } from '../../lib/highlightMatches'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../../lib/threadText'
import { isMutedText, stripMutedText } from '../../lib/mutedText'
import { CategoryInlineCreator } from '../CategoryInlineCreator'
import pinIcon from '../../assets/pin.svg'
import pinFilledIcon from '../../assets/pin-filled.svg'
import eraserIcon from '../../assets/eraser.svg'
import { EntryCard } from './EntryCard'

type ThreadCardProps = {
  thread: ThreadDetail
  theme: { card: string; entry: string }
  categories: CategorySummary[]
  normalizedSearchQuery: string
  entryDepth: Map<string, number>
  linkTo: string
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
  t: (key: string, options?: Record<string, unknown>) => string
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
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

export function ThreadCard({
  thread,
  theme,
  categories,
  normalizedSearchQuery,
  entryDepth,
  linkTo,
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
  t,
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
  handleTextareaInput,
  resizeTextarea,
}: ThreadCardProps) {
  const isThreadBodyMuted = isMutedText(thread.body)
  const rawBody = thread.body ? (isThreadBodyMuted ? stripMutedText(thread.body) : thread.body) : null
  const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : thread.title

  return (
    <div
      className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${theme.card}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-gray-100" />
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
              thread.pinned ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-400'
            }`}
            type="button"
            onClick={onTogglePin}
            disabled={isPinPending || isUnpinPending}
            aria-label={thread.pinned ? t('home.unpin') : t('home.pin')}
          >
            <img
              className="h-3.5 w-3.5"
              src={thread.pinned ? pinFilledIcon : pinIcon}
              alt=""
            />
          </button>
          {isEditing
            ? editingThreadCategories.map((categoryName) => (
                <button
                  key={categoryName}
                  className="inline-flex rounded-full border border-gray-900 bg-gray-900 px-2 py-0.5 text-xs font-normal text-white"
                  type="button"
                  onClick={() => onEditingCategoryToggle(categoryName)}
                >
                  {categoryName}
                </button>
              ))
            : thread.categories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex rounded-full border border-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600"
                >
                  {category.name}
                </span>
              ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-500"
            type="button"
            onClick={onStartEdit}
            aria-label={t('home.edit')}
          >
            <img className="h-3.5 w-3.5" src={eraserIcon} alt="" />
          </button>
          <button
            className={`rounded-full border px-1 py-0 text-[9px] ${
              isMutedText(thread.body)
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 text-gray-400'
            }`}
            type="button"
            onClick={onToggleMute}
            aria-label="Toggle strikethrough"
          >
            -
          </button>
          <button
            className="rounded-full border border-gray-200 px-1 py-0 text-[9px] text-gray-400"
            type="button"
            onClick={onHide}
            disabled={isHidePending}
            aria-label={t('home.archive')}
          >
            ×
          </button>
        </div>
      </div>
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
        <form
          className="mt-2 space-y-2 sm:mt-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editingThreadBody.trim()) {
              return
            }
            onSaveEdit()
          }}
        >
          <textarea
            className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={editingThreadBody}
            onChange={(event) => onEditingThreadBodyChange(event.target.value)}
            onInput={handleTextareaInput}
            data-autoresize="true"
            ref={(element) => resizeTextarea(element)}
          />
          <div className="mt-4 py-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {categories
                  .filter((category) => !editingThreadCategories.includes(category.name))
                  .map((category) => {
                    const isSelected = editingThreadCategories.includes(category.name)
                    return (
                      <button
                        key={category.id}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 text-gray-700'
                        }`}
                        type="button"
                        onClick={() => onEditingCategoryToggle(category.name)}
                      >
                        {category.name}
                      </button>
                    )
                  })}
                <div className="flex items-center">
                  <CategoryInlineCreator
                    isOpen={isAddingEditingCategory}
                    value={editingCategoryInput}
                    placeholder={t('home.categoryPlaceholder')}
                    addLabel={t('home.addCategory')}
                    cancelLabel={t('home.cancel')}
                    disabled={isCreateCategoryPending}
                    onOpen={onEditingCategoryOpen}
                    onValueChange={onEditingCategoryInputChange}
                    onSubmit={onEditingCategorySubmit}
                    onCancel={onEditingCategoryCancel}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
              type="submit"
              disabled={isUpdateThreadPending}
            >
              {t('home.save')}
            </button>
            <button
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
              type="button"
              onClick={onCancelEdit}
            >
              {t('home.cancel')}
            </button>
          </div>
        </form>
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
