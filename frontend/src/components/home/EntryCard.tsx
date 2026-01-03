import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { FormEvent } from 'react'
import type { EntryDetail } from '../../lib/api'
import { highlightMatches } from '../../lib/highlightMatches'
import { isMutedText, stripMutedText, toggleMutedText } from '../../lib/mutedText'
import eraserIcon from '../../assets/eraser.svg'

type EntryCardProps = {
  entry: EntryDetail
  depth: number
  themeEntryClass: string
  highlightQuery: string
  isEditing: boolean
  editingBody: string
  isReplyActive: boolean
  replyDraft: string
  isEntryUpdatePending: boolean
  isEntryHidePending: boolean
  isEntryToggleMutePending: boolean
  isReplyPending: boolean
  onEditStart: () => void
  onEditChange: (value: string) => void
  onEditCancel: () => void
  onEditSave: () => void
  onToggleMute: (nextBody: string) => void
  onHide: () => void
  onReplyStart: () => void
  onReplyChange: (value: string) => void
  onReplyCancel: () => void
  onReplySubmit: () => void
  handleTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void
  resizeTextarea: (element: HTMLTextAreaElement | null) => void
}

export function EntryCard({
  entry,
  depth,
  themeEntryClass,
  highlightQuery,
  isEditing,
  editingBody,
  isReplyActive,
  replyDraft,
  isEntryUpdatePending,
  isEntryHidePending,
  isEntryToggleMutePending,
  isReplyPending,
  onEditStart,
  onEditChange,
  onEditCancel,
  onEditSave,
  onToggleMute,
  onHide,
  onReplyStart,
  onReplyChange,
  onReplyCancel,
  onReplySubmit,
  handleTextareaInput,
  resizeTextarea,
}: EntryCardProps) {
  const { t } = useTranslation()
  const indentClass = depth === 2 ? 'ml-6' : depth >= 3 ? 'ml-12' : ''
  const muted = isMutedText(entry.body)

  return (
    <div
      className={`relative rounded-lg border px-1.5 py-1 shadow-sm sm:px-3 sm:py-2 ${themeEntryClass} ${indentClass}`}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-500"
          type="button"
          onClick={onEditStart}
          aria-label={t('home.edit')}
        >
          <img className="h-3.5 w-3.5" src={eraserIcon} alt="" />
        </button>
        <button
          className={`rounded-full border px-1 py-0 text-[8px] ${
            muted ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-400'
          }`}
          type="button"
          onClick={() => onToggleMute(toggleMutedText(entry.body))}
          disabled={isEntryToggleMutePending}
          aria-label="Toggle strikethrough"
        >
          -
        </button>
        <button
          className="rounded-full border border-gray-200 px-1 py-0 text-[8px] text-gray-400"
          type="button"
          onClick={onHide}
          disabled={isEntryHidePending}
          aria-label={t('home.archive')}
        >
          ×
        </button>
      </div>
      {isEditing ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editingBody.trim()) {
              return
            }
            onEditSave()
          }}
        >
          <textarea
            className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={editingBody}
            onChange={(event) => onEditChange(event.target.value)}
            onInput={handleTextareaInput}
            data-autoresize="true"
            ref={(element) => resizeTextarea(element)}
          />
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
              type="submit"
              disabled={isEntryUpdatePending}
            >
              {t('home.save')}
            </button>
            <button
              className="rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-700"
              type="button"
              onClick={onEditCancel}
            >
              {t('home.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div
            className={`text-sm ${muted ? 'text-gray-400 line-through' : 'text-gray-800'}`}
          >
            {highlightMatches(muted ? stripMutedText(entry.body) : entry.body, highlightQuery)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>
              {formatDistanceToNow(new Date(entry.createdAt), {
                addSuffix: true,
              })}
            </span>
            <div className="flex items-center gap-2">
              {depth < 3 && (
                <button
                  className="rounded-md border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
                  type="button"
                  onClick={onReplyStart}
                >
                  {t('home.reply')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
      {isReplyActive && depth < 3 && (
        <form
          className="mt-1 space-y-2 sm:mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!replyDraft.trim()) {
              return
            }
            onReplySubmit()
          }}
        >
          <textarea
            className="min-h-[64px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder={t('home.replyPlaceholder')}
            value={replyDraft}
            onChange={(event) => onReplyChange(event.target.value)}
            onInput={handleTextareaInput}
            data-autoresize="true"
            ref={(element) => resizeTextarea(element)}
          />
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
              type="submit"
              disabled={isReplyPending}
            >
              {t('home.reply')}
            </button>
            <button
              className="rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-700"
              type="button"
              onClick={onReplyCancel}
            >
              {t('home.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
