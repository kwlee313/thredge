import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useMemo, type FormEvent } from 'react'
import type { CategorySummary, ThreadDetail } from '../../lib/api'
import { highlightMatches } from '../../lib/highlightMatches'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../../lib/threadText'
import { isMutedText, stripMutedText } from '../../lib/mutedText'
import { buildEntryOrder } from '../../lib/entryOrder'
import { EntryCard } from './EntryCard'
import { ThreadCardHeader } from './ThreadCardHeader'
import { ThreadEditor } from './ThreadEditor'
import { EntryComposer } from './EntryComposer'

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
  onEntryMove: (entryId: string, direction: 'UP' | 'DOWN', threadId: string) => void
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
    onEntryMove,
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
  const orderedEntries = useMemo(() => buildEntryOrder(thread.entries), [thread.entries])
  const entryStructure = useMemo(() => {
    const entryById = new Map(thread.entries.map((entry) => [entry.id, entry]))
    const childrenByParent = new Map<string, typeof thread.entries>()
    const roots: typeof thread.entries = []
    thread.entries.forEach((entry) => {
      const parentId = entry.parentEntryId
      if (parentId && entryById.has(parentId)) {
        const children = childrenByParent.get(parentId)
        if (children) {
          children.push(entry)
        } else {
          childrenByParent.set(parentId, [entry])
        }
      } else {
        roots.push(entry)
      }
    })
    const byOrderIndex = (a: typeof thread.entries[number], b: typeof thread.entries[number]) =>
      a.orderIndex === b.orderIndex
        ? a.createdAt.localeCompare(b.createdAt)
        : a.orderIndex - b.orderIndex
    roots.sort(byOrderIndex)
    childrenByParent.forEach((children) => children.sort(byOrderIndex))
    return { entryById, childrenByParent, roots }
  }, [thread.entries])
  const entryIndexById = useMemo(
    () => new Map(orderedEntries.map((entry, index) => [entry.id, index])),
    [orderedEntries],
  )
  const entrySubtreeDepth = useMemo(() => {
    const depthCache = new Map<string, number>()
    const resolveDepth = (entryId: string): number => {
      const cached = depthCache.get(entryId)
      if (cached) {
        return cached
      }
      const children = entryStructure.childrenByParent.get(entryId) ?? []
      if (children.length === 0) {
        depthCache.set(entryId, 1)
        return 1
      }
      const maxChildDepth = Math.max(...children.map((child) => resolveDepth(child.id)))
      const depth = 1 + maxChildDepth
      depthCache.set(entryId, depth)
      return depth
    }
    thread.entries.forEach((entry) => {
      resolveDepth(entry.id)
    })
    return depthCache
  }, [thread.entries, entryStructure.childrenByParent])
  const resolveRootId = (entryId: string) => {
    let currentId: string | null | undefined = entryId
    let rootId: string | null = null
    while (currentId) {
      rootId = currentId
      currentId = entryStructure.entryById.get(currentId)?.parentEntryId ?? null
    }
    return rootId
  }
  const isAncestor = (ancestorId: string, entryId: string) => {
    let currentId: string | null | undefined = entryId
    while (currentId) {
      if (currentId === ancestorId) {
        return true
      }
      currentId = entryStructure.entryById.get(currentId)?.parentEntryId ?? null
    }
    return false
  }

  return (
    <div
      className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${theme.card}`}
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
        onToggleMute={onToggleMute}
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
            {highlightMatches(displayTitle, normalizedSearchQuery)}
          </span>
        ) : (
          <Link
            className={`hover:underline ${
              isThreadBodyMuted
                ? 'text-[var(--theme-muted)] opacity-50 line-through'
                : 'text-[var(--theme-ink)]'
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
          isCreateCategoryPending={isCreateCategoryPending}
          isSaving={isUpdateThreadPending}
          onToggleCategory={onEditingCategoryToggle}
          onCategoryInputChange={onEditingCategoryInputChange}
          onCategoryCancel={onEditingCategoryCancel}
          onCategorySubmit={onEditingCategorySubmit}
          labels={{
            save: t('common.save'),
            cancel: t('common.cancel'),
            categorySearchPlaceholder: t('home.categorySearchPlaceholder'),
            addCategory: t('home.addCategory'),
            cancelCategory: t('common.cancel'),
            loadMore: t('home.loadMore'),
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
                isThreadBodyMuted
                  ? 'text-[var(--theme-muted)] opacity-50 line-through'
                  : 'text-[var(--theme-ink)]'
              }`}
            >
              {highlightMatches(body, normalizedSearchQuery)}
            </p>
          ) : null
        })()
      )}
      <div className="mt-4 space-y-2 sm:mt-8">
        {orderedEntries.map((entry) => {
          const resolvedParentId =
            entry.parentEntryId && entryStructure.entryById.has(entry.parentEntryId)
              ? entry.parentEntryId
              : null
          const children = entryStructure.childrenByParent.get(entry.id) ?? []
          const hasChildren = children.length > 0
          const parentChildren = resolvedParentId
            ? entryStructure.childrenByParent.get(resolvedParentId) ?? []
            : []
          const isTopReply = resolvedParentId && parentChildren[0]?.id === entry.id
          const isBottomReply =
            resolvedParentId && parentChildren[parentChildren.length - 1]?.id === entry.id
          const isTopRoot = !resolvedParentId && entryStructure.roots[0]?.id === entry.id
          const isBottomRoot =
            !resolvedParentId &&
            entryStructure.roots[entryStructure.roots.length - 1]?.id === entry.id
          const index = entryIndexById.get(entry.id) ?? -1
          const prevEntry = index > 0 ? orderedEntries[index - 1] : null
          const nextEntry =
            index >= 0 && index < orderedEntries.length - 1 ? orderedEntries[index + 1] : null
          const subtreeDepth = entrySubtreeDepth.get(entry.id) ?? 1
          let canMoveUp = true
          let canMoveDown = true
          if (resolvedParentId && hasChildren) {
            canMoveUp = false
            canMoveDown = false
          } else {
            if (isTopRoot) {
              canMoveUp = false
            } else if (!isTopReply) {
              if (!prevEntry) {
                canMoveUp = false
              } else {
                const prevRootId = resolveRootId(prevEntry.id)
                const parentDepth = prevRootId ? entryDepth.get(prevRootId) ?? 1 : 1
                if (parentDepth + subtreeDepth > 3) {
                  canMoveUp = false
                }
                if (isAncestor(entry.id, prevEntry.id)) {
                  canMoveUp = false
                }
              }
            }
            if (isBottomRoot) {
              canMoveDown = false
            } else if (!isBottomReply) {
              if (!nextEntry) {
                canMoveDown = false
              } else {
                const nextRootId = resolveRootId(nextEntry.id)
                const parentDepth = nextRootId ? entryDepth.get(nextRootId) ?? 1 : 1
                if (parentDepth + subtreeDepth > 3) {
                  canMoveDown = false
                }
                if (isAncestor(entry.id, nextEntry.id)) {
                  canMoveDown = false
                }
              }
            }
          }
          return (
            <EntryCard
              key={entry.id}
              data={{
                entry,
                depth: entryDepth.get(entry.id) ?? 1,
                themeEntryClass: theme.entry,
                highlightQuery: normalizedSearchQuery,
              }}
              ui={{
                showMoveControls: true,
                isEditing: editingEntryId === entry.id,
                editingBody: editingEntryBody,
                isReplyActive: activeReplyId === entry.id,
                replyDraft: replyDrafts[entry.id] ?? '',
                isEntryUpdatePending,
                isEntryHidePending,
                isEntryToggleMutePending,
                isEntryMovePending,
                isMoveUpDisabled: !canMoveUp,
                isMoveDownDisabled: !canMoveDown,
                isReplyPending,
                replyComposerFocusId,
                onReplyComposerFocusHandled,
              }}
              actions={{
                onEditStart: () => onEntryEditStart(entry.id, entry.body),
                onEditChange: onEntryEditChange,
                onEditCancel: onEntryEditCancel,
                onEditSave: () => onEntryEditSave(entry.id),
                onToggleMute: (nextBody) => onEntryToggleMute(entry.id, nextBody),
                onHide: () => onEntryHide(entry.id),
                onMoveUp: () => {
                  if (!canMoveUp) {
                    return
                  }
                  onEntryMove(entry.id, 'UP', thread.id)
                },
                onMoveDown: () => {
                  if (!canMoveDown) {
                    return
                  }
                  onEntryMove(entry.id, 'DOWN', thread.id)
                },
                onReplyStart: () => onReplyStart(entry.id),
                onReplyChange: (value) => onReplyChange(entry.id, value),
                onReplyCancel: onReplyCancel,
                onReplySubmit: () => onReplySubmit(entry.id),
              }}
              helpers={{
                handleTextareaInput,
                resizeTextarea,
              }}
            />
          )
        })}
      </div>
      <EntryComposer
        value={newEntryDraft}
        placeholder={t('common.entryPlaceholder')}
        onChange={onNewEntryChange}
        onSubmit={onNewEntrySubmit}
        isSubmitting={isAddEntryPending}
        labels={{ submit: t('common.addEntry'), submitting: t('common.loading') }}
        handleTextareaInput={handleTextareaInput}
        resizeTextarea={resizeTextarea}
        focusId={`entry:${thread.id}`}
        activeFocusId={entryComposerFocusId}
        onFocusHandled={onEntryComposerFocusHandled}
      />
      <div className="mt-2 text-xs text-[var(--theme-muted)] opacity-50 sm:mt-4">
        {t('home.lastActivity', {
          time: formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true }),
        })}
      </div>
    </div>
  )
}
