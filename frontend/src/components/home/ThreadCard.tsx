import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { type JSX, useEffect, useMemo, useRef, useState, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { fetchThreadEntries, type CategorySummary, type EntryMovePosition, type ThreadFeedItem, type EntryDetail } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { highlightMatches } from '../../lib/highlightMatches'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../../lib/threadText'
import { isMutedText, stripMutedText } from '../../lib/mutedText'
import { buildEntryOrder } from '../../lib/entryOrder'
import { buildEntryDepthMap } from '../../lib/entryDepth'
import { EntryCard } from './EntryCard'
import { ThreadCardHeader } from './ThreadCardHeader'
import { ThreadEditor } from './ThreadEditor'
import { EntryComposer } from './EntryComposer'
import { Tooltip } from '../common/Tooltip'
import type { EntryDragState } from './types'

type ThreadCardData = {
  thread: ThreadFeedItem
  theme: { card: string; entry: string }
  categories: CategorySummary[]
  normalizedSearchQuery: string
  linkTo: string
}

type ThreadCardUi = {
  isEditing: boolean
  editingThreadBody: string
  editingThreadCategories: string[]
  editingCategoryInput: string
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
  isEntryMovePending: boolean
  isReplyPending: boolean
  isAddEntryPending: boolean
  entryComposerFocusId: string | null
  onEntryComposerFocusHandled: () => void
  replyComposerFocusId: string | null
  onReplyComposerFocusHandled: () => void
}

type ThreadCardActions = {
  onStartEdit: () => void
  onCancelEdit: () => void
  onEditingThreadBodyChange: (value: string) => void
  onEditingCategoryToggle: (name: string) => void
  onEditingCategoryInputChange: (value: string) => void
  onEditingCategoryCancel: () => void
  onEditingCategorySubmit: () => void
  onSaveEdit: (value: string) => void
  onTogglePin: () => void
  onToggleMute: () => void
  onHide: () => void
  onEntryEditStart: (entryId: string, body: string) => void
  onEntryEditChange: (value: string) => void
  onEntryEditCancel: () => void
  onEntryEditSave: (entryId: string, value?: string) => void
  onEntryToggleMute: (entryId: string, body: string) => void
  onEntryHide: (entryId: string) => void
  onEntryMoveTo: (
    entryId: string,
    targetEntryId: string,
    position: EntryMovePosition,
    threadId: string,
  ) => Promise<void>
  onReplyStart: (entryId: string) => void
  onReplyChange: (entryId: string, value: string) => void
  onReplyCancel: () => void
  onReplySubmit: (entryId: string, value: string) => void
  onNewEntryChange: (value: string) => void
  onNewEntrySubmit: (value: string) => void
}

type ThreadCardProps = {
  data: ThreadCardData
  ui: ThreadCardUi
  actions: ThreadCardActions
}

export const ThreadCard = memo(function ThreadCard({ data, ui, actions }: ThreadCardProps) {
  const {
    thread,
    theme,
    categories,
    normalizedSearchQuery,
    linkTo,
  } = data
  const {
    isEditing,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
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
    isEntryMovePending,
    isReplyPending,
    isAddEntryPending,
    entryComposerFocusId,
    onEntryComposerFocusHandled,
    replyComposerFocusId,
    onReplyComposerFocusHandled,
  } = ui
  const {
    onStartEdit,
    onCancelEdit,
    onEditingThreadBodyChange,
    onEditingCategoryToggle,
    onEditingCategoryInputChange,
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
    onEntryMoveTo,
    onReplyStart,
    onReplyChange,
    onReplyCancel,
    onReplySubmit,
    onNewEntryChange,
    onNewEntrySubmit,
  } = actions
  const { t } = useTranslation() // Wait, t was passed in helpers. I need to bring useTranslation here or pass t as a separate prop if I want to keep it pure? 
  // ThreadCard is heavy, memo is good. 
  // t function usually stable? 
  // Let's import useTranslation.
  const isThreadBodyMuted = isMutedText(thread.body)
  const rawBody = thread.body ? (isThreadBodyMuted ? stripMutedText(thread.body) : thread.body) : null
  const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : thread.title
  const entriesQuery = useQuery({
    queryKey: queryKeys.threads.entries(thread.id),
    queryFn: () => fetchThreadEntries(thread.id),
  })
  const entries: EntryDetail[] = entriesQuery.data ?? []
  const visibleEntries = useMemo(
    () => entries.filter((e) => !e.hidden && !e.isHidden),
    [entries],
  )
  const orderedEntries = useMemo(() => buildEntryOrder(visibleEntries), [visibleEntries])
  const entryDepth = useMemo(() => buildEntryDepthMap(visibleEntries), [visibleEntries])
  const [dragState, setDragState] = useState<EntryDragState>({
    activeEntryId: null,
    overEntryId: null,
    overPosition: null,
  })
  const [dragError, setDragError] = useState<string | null>(null)
  const dragStateRef = useRef(dragState)
  const setDragStateSafe = (updater: EntryDragState | ((prev: EntryDragState) => EntryDragState)) =>
    setDragState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      dragStateRef.current = next
      return next
    })
  const resetDragState = () =>
    setDragStateSafe({ activeEntryId: null, overEntryId: null, overPosition: null })

  const computeRenderDropIndex = (state: EntryDragState) => {
    const { activeEntryId, overEntryId, overPosition } = state
    if (!activeEntryId || !overEntryId || !overPosition) {
      return null
    }
    if (activeEntryId === overEntryId) {
      return null
    }
    const overIndex = orderedEntries.findIndex((entry) => entry.id === overEntryId)
    if (overIndex === -1) {
      return null
    }
    if (overPosition === 'child') {
      return overIndex + 1
    }
    return overPosition === 'before' ? overIndex : overIndex + 1
  }

  const finalizeDrag = async (state: EntryDragState) => {
    const { activeEntryId, overEntryId, overPosition } = state
    if (!activeEntryId || !overEntryId || !overPosition) {
      return
    }
    try {
      const position: EntryMovePosition =
        overPosition === 'before' ? 'BEFORE' : overPosition === 'after' ? 'AFTER' : 'CHILD'
      await onEntryMoveTo(activeEntryId, overEntryId, position, thread.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reply move failed.'
      setDragError(message)
    }
  }

  const handleDragStart = (entryId: string) => {
    if (isEntryMovePending) {
      return
    }
    setDragError(null)
    setDragStateSafe({ activeEntryId: entryId, overEntryId: null, overPosition: null })
  }

  const handleDragHover = (entryId: string, position: 'before' | 'after' | 'child') => {
    if (!dragStateRef.current.activeEntryId) {
      return
    }
    if (dragStateRef.current.activeEntryId === entryId) {
      setDragStateSafe((prev) =>
        prev.overEntryId ? { ...prev, overEntryId: null, overPosition: null } : prev,
      )
      return
    }
    setDragStateSafe((prev) => {
      if (prev.overEntryId === entryId && prev.overPosition === position) {
        return prev
      }
      return { ...prev, overEntryId: entryId, overPosition: position }
    })
  }

  const handleDragEnd = () => {
    const finalState = dragStateRef.current
    resetDragState()
    void finalizeDrag(finalState)
  }

  useEffect(() => {
    if (!dragState.activeEntryId) {
      return
    }
    const previousTouchAction = document.body.style.touchAction
    const previousUserSelect = document.body.style.userSelect
    document.body.style.touchAction = 'none'
    document.body.style.userSelect = 'none'
    const handleGlobalPointerUp = () => {
      handleDragEnd()
    }
    const handleGlobalPointerMove = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)
      if (!target) {
        return
      }
      const entryElement = target.closest('[data-entry-id]') as HTMLElement | null
      if (!entryElement) {
        setDragStateSafe((prev) =>
          prev.overEntryId ? { ...prev, overEntryId: null, overPosition: null } : prev,
        )
        return
      }
      const entryId = entryElement.getAttribute('data-entry-id')
      if (!entryId) {
        return
      }
      const rect = entryElement.getBoundingClientRect()
      const depthAttr = entryElement.getAttribute('data-entry-depth')
      const depth = depthAttr ? Number(depthAttr) : 1
      const isChildZone =
        depth < 3 && event.clientY < rect.top + rect.height * 0.8
      const position = isChildZone
        ? 'child'
        : event.clientY < rect.top + rect.height / 2
          ? 'before'
          : 'after'
      handleDragHover(entryId, position)
    }
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)
    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      document.body.style.touchAction = previousTouchAction
      document.body.style.userSelect = previousUserSelect
    }
  }, [dragState.activeEntryId])

  const renderDropIndicator = (depth: number, key: string) => {
    const indentPx = depth === 2 ? 24 : depth >= 3 ? 48 : 0
    return (
      <div key={key} className="pointer-events-none px-1">
        <div className="relative h-1">
          <div
            className="absolute h-1 rounded-full bg-[var(--theme-ink)]"
            style={{
              left: indentPx,
              right: 0,
            }}
          />
        </div>
      </div>
    )
  }

  const renderDropIndex = computeRenderDropIndex(dragState)
  const dropDepth =
    dragState.overEntryId && dragState.overEntryId !== dragState.activeEntryId
      ? (entryDepth.get(dragState.overEntryId) ?? 1) + (dragState.overPosition === 'child' ? 1 : 0)
      : 1

  return (
    <div
      className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${thread.pinned ? 'text-xs' : ''} ${theme.card}`}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-[var(--theme-border)]" />
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
          edit: t('common.edit'),
          archive: t('common.archive'),
        }}
        onTogglePin={onTogglePin}
        onStartEdit={onStartEdit}
        onHide={onHide}
        onEditingCategoryToggle={onEditingCategoryToggle}
      />
      <div className="mt-8 pl-3 text-sm font-semibold">
        {isEditing ? (
          <span
            className={
              isThreadBodyMuted
                ? 'text-[var(--theme-muted)] opacity-50 line-through'
                : 'text-[var(--theme-ink)]'
            }
          >
            {highlightMatches(displayTitle, normalizedSearchQuery, { disableLinks: true })}
          </span>
        ) : (
          <Link
            className={`hover:underline ${isThreadBodyMuted
              ? 'text-[var(--theme-muted)] opacity-50 line-through'
              : 'text-[var(--theme-ink)]'
              }`}
            to={linkTo}
          >
            {highlightMatches(displayTitle, normalizedSearchQuery, { disableLinks: true })}
          </Link>
        )}
      </div>
      {isEditing ? (
        <ThreadEditor
          value={editingThreadBody}
          onChange={onEditingThreadBodyChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onComplete={onToggleMute}
          categories={categories}
          selectedCategories={editingThreadCategories}
          editingCategoryInput={editingCategoryInput}
          isCreateCategoryPending={isCreateCategoryPending}
          isSaving={isUpdateThreadPending}
          onToggleCategory={onEditingCategoryToggle}
          onCategoryInputChange={onEditingCategoryInputChange}
          onCategoryCancel={onEditingCategoryCancel}
          onCategorySubmit={onEditingCategorySubmit}
          labels={{
            save: t('common.save'),
            cancel: t('common.cancel'),
            complete: '완료',
            categorySearchPlaceholder: t('home.categorySearchPlaceholder'),
            addCategory: t('home.addCategory'),
            cancelCategory: t('common.cancel'),
            loadMore: t('home.loadMore'),
          }}
        />
      ) : (
        thread.body &&
        (() => {
          const normalizedBody =
            thread.body && isThreadBodyMuted ? stripMutedText(thread.body) : thread.body
          const body = normalizedBody ? getBodyWithoutTitle(displayTitle, normalizedBody) : ''
          const hasHtmlLineBreaks = /<(p|br)\s*\/?>/i.test(body)
          // Decode HTML entities
          const processedBody = hasHtmlLineBreaks ? body.replace(/\r?\n/g, '') : body
          return processedBody.trim() ? (
            <p
              className={`mt-2 whitespace-pre-wrap text-sm ${isThreadBodyMuted
                ? 'text-[var(--theme-muted)] opacity-50 line-through'
                : 'text-[var(--theme-ink)]'
                }`}
            >
              {highlightMatches(processedBody.trim(), normalizedSearchQuery)}
            </p>
          ) : null
        })()
      )}
      {dragError && <div className="mt-3 text-xs text-red-600">{dragError}</div>}
      <div className="mt-4 space-y-2 sm:mt-8">
        {(() => {
          const rendered: JSX.Element[] = []
          orderedEntries.forEach((entry) => {
            const depth = entryDepth.get(entry.id) ?? 1
            if (renderDropIndex !== null && renderDropIndex === rendered.length) {
              rendered.push(renderDropIndicator(dropDepth, `drop-${thread.id}`))
            }
            rendered.push(
              <EntryCard
                key={entry.id}
                data={{
                  entry,
                  depth,
                  themeEntryClass: theme.entry,
                  highlightQuery: normalizedSearchQuery,
                }}
                ui={{
                  isEditing: editingEntryId === entry.id,
                  editingBody: editingEntryBody,
                  isReplyActive: activeReplyId === entry.id,
                  replyDraft: replyDrafts[entry.id] ?? '',
                  isEntryUpdatePending,
                  isEntryHidePending,
                  isEntryToggleMutePending,
                  isEntryMovePending,
                  isReplyPending,
                  dragState,
                  replyComposerFocusId,
                  onReplyComposerFocusHandled,
                }}
                actions={{
                  onEditStart: () => onEntryEditStart(entry.id, entry.body),
                  onEditChange: onEntryEditChange,
                  onEditCancel: onEntryEditCancel,
                  onEditSave: (val) => onEntryEditSave(entry.id, val),
                  onToggleMute: (nextBody) => onEntryToggleMute(entry.id, nextBody),
                  onHide: () => onEntryHide(entry.id),
                  onDragStart: handleDragStart,
                  onDragEnd: handleDragEnd,
                  onReplyStart: () => onReplyStart(entry.id),
                  onReplyChange: (value) => onReplyChange(entry.id, value),
                  onReplyCancel: onReplyCancel,
                  onReplySubmit: (value) => onReplySubmit(entry.id, value),
                }}
              />,
            )
          })
          if (renderDropIndex !== null && renderDropIndex === rendered.length) {
            rendered.push(renderDropIndicator(dropDepth, `drop-${thread.id}-tail`))
          }
          return rendered
        })()}
      </div>
      {!thread.pinned && (
        <EntryComposer
          value={newEntryDraft}
          placeholder={t('common.entryPlaceholder')}
          onChange={onNewEntryChange}
          onSubmit={onNewEntrySubmit}
          isSubmitting={isAddEntryPending}
          labels={{ submit: t('common.addEntry'), submitting: t('common.loading') }}
          focusId={`entry:${thread.id}`}
          activeFocusId={entryComposerFocusId}
          onFocusHandled={onEntryComposerFocusHandled}
        />
      )}
      <div className="mt-2 text-xs text-[var(--theme-muted)] sm:mt-4">
        <Tooltip content={new Date(thread.lastActivityAt).toLocaleString()}>
          <span className="opacity-50">
            {t('home.lastActivity', {
              time: formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true }),
            })}
          </span>
        </Tooltip>
      </div>
    </div>
  )
})
