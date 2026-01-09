import { formatDistanceToNow } from 'date-fns'
import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { EntryCardActions, EntryCardData, EntryCardUi } from './types'
import { highlightMatches } from '../../lib/highlightMatches'
import { isMutedText, stripMutedText, toggleMutedText } from '../../lib/mutedText'
import eraserIcon from '../../assets/eraser.svg?raw'
import xIcon from '../../assets/x.svg?raw'
import { EntryEditor } from './EntryEditor'
import { ReplyComposer } from './ReplyComposer'
import { InlineIcon } from '../common/InlineIcon'
import { Tooltip } from '../common/Tooltip'

type EntryCardProps = {
  data: EntryCardData
  ui: EntryCardUi
  actions: EntryCardActions
}

export function EntryCard({
  data,
  ui,
  actions,
}: EntryCardProps) {
  const { t } = useTranslation()
  const { entry, depth, themeEntryClass, highlightQuery } = data
  const {
    isEditing,
    editingBody,
    isReplyActive,
    replyDraft,
    isEntryUpdatePending,
    isEntryHidePending,
    isEntryToggleMutePending,
    isEntryMovePending,
    isReplyPending,
    dragState,
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
    onDragStart,
    onDragEnd,
    onReplyStart,
    onReplyChange,
    onReplyCancel,
    onReplySubmit,
  } = actions
  const indentClass = depth === 2 ? 'ml-6' : depth >= 3 ? 'ml-12' : ''
  const muted = isMutedText(entry.body)
  const isDragActive = Boolean(dragState?.activeEntryId)
  const isDraggingEntry = dragState?.activeEntryId === entry.id
  const dragCursorClass = isEditing
    ? 'cursor-text'
    : isDragActive
      ? 'cursor-grabbing select-none touch-none'
      : 'cursor-default'
  const pressTimerRef = useRef<number | null>(null)
  const pressStartRef = useRef<{ x: number; y: number } | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const pointerTargetRef = useRef<HTMLDivElement | null>(null)
  const isLongPressActiveRef = useRef(false)

  const cleanupDrag = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    const target = pointerTargetRef.current
    if (target) {
      target.removeEventListener('touchmove', handleTouchMove)
      const pointerId = pointerIdRef.current
      if (pointerId !== null) {
        try {
          target.releasePointerCapture(pointerId)
        } catch {
          // Ignore release failures.
        }
      }
    }
    pressStartRef.current = null
    pointerTargetRef.current = null
    pointerIdRef.current = null
    isLongPressActiveRef.current = false
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (isLongPressActiveRef.current && e.cancelable) {
      e.preventDefault()
    }
  }

  const shouldIgnorePress = (eventTarget: EventTarget | null) => {
    let target = eventTarget as Node | null
    if (target?.nodeType === 3) { // Node.TEXT_NODE
      target = target.parentElement
    }
    if (!target || !(target instanceof HTMLElement)) {
      return false
    }
    return Boolean(
      target.closest('button, input, textarea, a') || target.closest('[data-no-drag]'),
    )
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isEditing || isEntryMovePending || shouldIgnorePress(event.target)) {
      return
    }
    pointerIdRef.current = event.pointerId
    pointerTargetRef.current = event.currentTarget
    pressStartRef.current = { x: event.clientX, y: event.clientY }
    isLongPressActiveRef.current = false

    // Attach non-passive listener to block scroll
    event.currentTarget.addEventListener('touchmove', handleTouchMove, { passive: false })

    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
    }
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null
      isLongPressActiveRef.current = true
      const target = pointerTargetRef.current
      const pointerId = pointerIdRef.current
      if (target && pointerId !== null) {
        try {
          target.setPointerCapture(pointerId)
        } catch {
          // Pointer capture can fail if the pointer is no longer active.
        }
      }
      onDragStart?.(entry.id)
    }, 320)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pressStartRef.current) {
      return
    }
    const distance = Math.hypot(
      event.clientX - pressStartRef.current.x,
      event.clientY - pressStartRef.current.y,
    )
    if (distance > 6 && !isLongPressActiveRef.current) {
      cleanupDrag()
      if (isDragActive) {
        onDragEnd?.()
      }
    }
  }

  const handlePointerUp = () => {
    cleanupDrag()
    if (isDragActive) {
      onDragEnd?.()
    }
  }

  const handlePointerCancel = () => {
    cleanupDrag()
    if (isDragActive) {
      onDragEnd?.()
    }
  }

  const handlePointerLeave = () => {
    if (isDragActive) {
      return
    }
    cleanupDrag()
  }

  return (
    <div
      className={`relative min-h-[65px] rounded-lg border px-1.5 py-1 pb-6 pr-16 shadow-sm sm:px-3 sm:py-2 sm:pb-6 sm:pr-20 ${themeEntryClass} ${indentClass} ${dragCursorClass} ${isDraggingEntry ? 'opacity-70' : ''
        }`}
      data-entry-id={entry.id}
      data-entry-depth={depth}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
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
          className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--theme-border)] text-[8px] text-[var(--theme-muted)] hover:opacity-80"
          type="button"
          onClick={onHide}
          disabled={isEntryHidePending}
          aria-label={t('common.archive')}
        >
          <InlineIcon svg={xIcon} className="[&>svg]:h-2.5 [&>svg]:w-2.5" />
        </button>
      </div>
      {isEditing ? (
        <EntryEditor
          value={editingBody}
          onChange={onEditChange}
          onSave={onEditSave}
          onCancel={onEditCancel}
          onComplete={() => onToggleMute(toggleMutedText(entry.body))}
          isSaving={isEntryUpdatePending}
          isCompletePending={isEntryToggleMutePending}
          labels={{ save: t('common.save'), cancel: t('common.cancel'), complete: '완료' }}
        />
      ) : (
        <>
          <div
            className={`mb-2 whitespace-pre-wrap text-sm ${muted
              ? 'text-[var(--theme-muted)] opacity-50 line-through'
              : 'text-[var(--theme-ink)]'
              }`}
            data-no-drag="true"
          >
            {highlightMatches(muted ? stripMutedText(entry.body) : entry.body, highlightQuery)}
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-[var(--theme-muted)]">
            <Tooltip content={new Date(entry.createdAt).toLocaleString()}>
              <span className="opacity-50">
                {formatDistanceToNow(new Date(entry.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </Tooltip>
            {depth < 3 && (
              <button
                className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-muted)] opacity-50 hover:opacity-80"
                type="button"
                onClick={onReplyStart}
              >
                {t('common.reply')}
              </button>
            )}
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
          focusId={`reply:${entry.id}`}
          activeFocusId={replyComposerFocusId}
          onFocusHandled={onReplyComposerFocusHandled}
        />
      )}
    </div>
  )
}
