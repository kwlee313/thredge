import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { EntryCardActions, EntryCardData, EntryCardHelpers, EntryCardUi } from './types'
import { highlightMatches } from '../../lib/highlightMatches'
import { isMutedText, stripMutedText, toggleMutedText } from '../../lib/mutedText'
import eraserIcon from '../../assets/eraser.svg?raw'
import { EntryEditor } from './EntryEditor'
import { ReplyComposer } from './ReplyComposer'
import { InlineIcon } from '../common/InlineIcon'

type EntryCardProps = {
  data: EntryCardData
  ui: EntryCardUi
  actions: EntryCardActions
  helpers: EntryCardHelpers
}

export function EntryCard({
  data,
  ui,
  actions,
  helpers,
}: EntryCardProps) {
  const { t } = useTranslation()
  const { entry, depth, themeEntryClass, highlightQuery } = data
  const {
    showMoveControls,
    isEditing,
    editingBody,
    isReplyActive,
    replyDraft,
    isEntryUpdatePending,
    isEntryHidePending,
    isEntryToggleMutePending,
    isEntryMovePending,
    isMoveUpDisabled,
    isMoveDownDisabled,
    isReplyPending,
    replyComposerFocusId,
    onReplyComposerFocusHandled,
  } = ui
  const {
    onEditStart,
    onEditChange,
    onEditCancel,
    onEditSave,
    onToggleMute,
    onHide,
    onMoveUp,
    onMoveDown,
    onReplyStart,
    onReplyChange,
    onReplyCancel,
    onReplySubmit,
  } = actions
  const { handleTextareaInput, resizeTextarea } = helpers
  const indentClass = depth === 2 ? 'ml-6' : depth >= 3 ? 'ml-12' : ''
  const muted = isMutedText(entry.body)

  return (
    <div
      className={`relative min-h-[65px] rounded-lg border px-1.5 py-1 pb-6 pr-16 shadow-sm sm:px-3 sm:py-2 sm:pb-6 sm:pr-20 ${themeEntryClass} ${indentClass}`}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--theme-border)] text-[var(--theme-ink)] hover:opacity-90"
          type="button"
          onClick={onEditStart}
          aria-label={t('common.edit')}
        >
          <InlineIcon svg={eraserIcon} className="[&>svg]:h-3.5 [&>svg]:w-3.5" />
        </button>
        <button
          className={`rounded-full border px-1 py-0 text-[8px] ${
            muted
              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
              : 'border-[var(--theme-border)] text-[var(--theme-muted)]'
          }`}
          type="button"
          onClick={() => onToggleMute(toggleMutedText(entry.body))}
          disabled={isEntryToggleMutePending}
          aria-label="Toggle strikethrough"
        >
          -
        </button>
        <button
          className="rounded-full border border-[var(--theme-border)] px-1 py-0 text-[8px] text-[var(--theme-muted)] hover:opacity-80"
          type="button"
          onClick={onHide}
          disabled={isEntryHidePending}
          aria-label={t('common.archive')}
        >
          ×
        </button>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {showMoveControls && (
          <>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--theme-border)] text-[10px] text-[var(--theme-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              onClick={onMoveUp}
              disabled={isEntryMovePending || isMoveUpDisabled}
              aria-label={t('common.moveUp')}
            >
              ^
            </button>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--theme-border)] text-[10px] text-[var(--theme-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              onClick={onMoveDown}
              disabled={isEntryMovePending || isMoveDownDisabled}
              aria-label={t('common.moveDown')}
            >
              v
            </button>
          </>
        )}
        {depth < 3 && (
          <button
            className="rounded-md border border-[var(--theme-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-ink)] hover:opacity-80"
            type="button"
            onClick={onReplyStart}
          >
            {t('common.reply')}
          </button>
        )}
      </div>
      {isEditing ? (
        <EntryEditor
          value={editingBody}
          onChange={onEditChange}
          onSave={onEditSave}
          onCancel={onEditCancel}
          isSaving={isEntryUpdatePending}
          labels={{ save: t('common.save'), cancel: t('common.cancel') }}
          handleTextareaInput={handleTextareaInput}
          resizeTextarea={resizeTextarea}
        />
      ) : (
        <>
          <div
            className={`mb-2 whitespace-pre-wrap text-sm ${
              muted
                ? 'text-[var(--theme-muted)] opacity-50 line-through'
                : 'text-[var(--theme-ink)]'
            }`}
          >
            {highlightMatches(muted ? stripMutedText(entry.body) : entry.body, highlightQuery)}
          </div>
          <div className="absolute bottom-2 left-2 text-xs text-[var(--theme-muted)] opacity-50">
            {formatDistanceToNow(new Date(entry.createdAt), {
              addSuffix: true,
            })}
          </div>
        </>
      )}
      {isReplyActive && depth < 3 && (
        <ReplyComposer
          value={replyDraft}
          placeholder={t('common.replyPlaceholder')}
          onChange={onReplyChange}
          onSubmit={onReplySubmit}
          onCancel={onReplyCancel}
          isSubmitting={isReplyPending}
          labels={{ submit: t('common.reply'), cancel: t('common.cancel') }}
          handleTextareaInput={handleTextareaInput}
          resizeTextarea={resizeTextarea}
          focusId={`reply:${entry.id}`}
          activeFocusId={replyComposerFocusId}
          onFocusHandled={onReplyComposerFocusHandled}
        />
      )}
    </div>
  )
}
