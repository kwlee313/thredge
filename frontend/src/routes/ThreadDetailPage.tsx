import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchCategories,
  fetchThread,
} from '../lib/api'
import type { EntryDetail } from '../lib/api'
import { useTextareaAutosize } from '../hooks/useTextareaAutosize'
import { useThreadActions } from '../hooks/useThreadActions'
import { THREAD_DETAIL_INVALIDATIONS } from '../hooks/threadActionPresets'
import { EntryCard } from '../components/home/EntryCard'
import { useThreadDetailState } from '../hooks/useThreadDetailState'
import { buildEntryDepthMap } from '../lib/entryDepth'
import { buildEntryOrder } from '../lib/entryOrder'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../lib/threadText'
import { isMutedText, stripMutedText, toggleMutedText } from '../lib/mutedText'
import { ThreadCardHeader } from '../components/home/ThreadCardHeader'
import { ThreadEditor } from '../components/home/ThreadEditor'
import { EntryComposer } from '../components/home/EntryComposer'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { queryKeys } from '../lib/queryKeys'
import { useEntryActions } from '../hooks/useEntryActions'
import { removeEntryFromThreadDetail, updateEntryInThreadDetail } from '../lib/threadCache'

export function ThreadDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { state, actions } = useThreadDetailState(id ?? undefined)
  const [entryComposerFocusId, setEntryComposerFocusId] = useState<string | null>(null)
  const [replyComposerFocusId, setReplyComposerFocusId] = useState<string | null>(null)
  const didAutoFocusEntryComposer = useRef(false)
  const {
    entryBody,
    replyDrafts,
    activeReplyId,
    editingEntryId,
    editingEntryBody,
    isEditingThread,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
  } = state
  const {
    thread: threadActions,
    entry: entryActions,
    reply: replyActions,
  } = actions
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize({
    deps: [editingThreadBody, editingEntryBody, replyDrafts, entryBody],
  })

  const threadQuery = useQuery({
    queryKey: queryKeys.thread.detail(id),
    queryFn: () => fetchThread(id ?? ''),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!id || !threadQuery.isSuccess || didAutoFocusEntryComposer.current) {
      return
    }
    didAutoFocusEntryComposer.current = true
    setEntryComposerFocusId(`entry:${id}`)
  }, [id, threadQuery.isSuccess])

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    enabled: threadQuery.isSuccess,
  })

  const { createCategoryMutation } = useCategoryMutations({
    onCreateSuccess: (created) => {
      threadActions.setEditingThreadCategories((prev) =>
        prev.includes(created.name) ? prev : [...prev, created.name],
      )
      threadActions.setEditingCategoryInput('')
      threadActions.setIsAddingEditingCategory(false)
    },
  })

  const submitCategory = () => {
    const name = editingCategoryInput.trim()
    if (!name) {
      return
    }
    createCategoryMutation.mutate({ name })
  }

  const { createEntryMutation, moveEntryMutation } = useEntryActions({
    threadId: id ?? undefined,
    invalidateTargets: ['thread', 'feed'],
    onEntryCreated: (_created, variables) => {
      if (variables.parentEntryId) {
        replyActions.updateReplyDraft(variables.parentEntryId, '')
        replyActions.cancelReply()
      } else {
        entryActions.setEntryBody('')
        setEntryComposerFocusId(`entry:${variables.threadId}`)
      }
    },
  })

  const {
    updateThreadMutation,
    toggleThreadMuteMutation,
    hideThreadMutation,
    pinThreadMutation,
    unpinThreadMutation,
    updateEntryMutation,
    toggleEntryMuteMutation,
    hideEntryMutation,
  } = useThreadActions({
    threadId: id ?? undefined,
    invalidateTargets: THREAD_DETAIL_INVALIDATIONS,
    onThreadUpdated: () => {
      if (!isEditingThread) {
        return
      }
      threadActions.setIsEditingThread(false)
      threadActions.setEditingCategoryInput('')
      threadActions.setIsAddingEditingCategory(false)
    },
    onThreadHidden: () => {
      navigate('/')
    },
    onEntryUpdated: (entryId, body) => {
      if (editingEntryId === entryId) {
        entryActions.cancelEntryEdit()
      }
      if (id) {
        updateEntryInThreadDetail(queryClient, id, entryId, body)
      }
    },
    onEntryHidden: (entryId) => {
      if (id) {
        removeEntryFromThreadDetail(queryClient, id, entryId)
      }
    },
  })

  useEffect(() => {
    if (threadQuery.data) {
      threadActions.syncThread(threadQuery.data)
    }
  }, [threadQuery.data])

  const entries = threadQuery.data?.entries ?? []
  const entryDepth = useMemo(() => buildEntryDepthMap(entries), [entries])
  const orderedEntries = useMemo(() => buildEntryOrder(entries), [entries])
  const entryStructure = useMemo(() => {
    const entryById = new Map(entries.map((entry) => [entry.id, entry]))
    const childrenByParent = new Map<string, EntryDetail[]>()
    const roots: EntryDetail[] = []
    entries.forEach((entry) => {
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
    const byOrderIndex = (a: EntryDetail, b: EntryDetail) =>
      a.orderIndex === b.orderIndex
        ? a.createdAt.localeCompare(b.createdAt)
        : a.orderIndex - b.orderIndex
    roots.sort(byOrderIndex)
    childrenByParent.forEach((children) => children.sort(byOrderIndex))
    return { entryById, childrenByParent, roots }
  }, [entries])
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
    entries.forEach((entry) => {
      resolveDepth(entry.id)
    })
    return depthCache
  }, [entries, entryStructure.childrenByParent])
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

  if (!id) {
    return (
      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-[var(--theme-ink)]">
        {t('thread.missing')}
      </div>
    )
  }

  const theme = {
    card: 'border-[var(--theme-border)] bg-[var(--theme-surface)]',
    entry: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center justify-between">
        <button
          className="text-sm text-[var(--theme-muted)]"
          type="button"
          onClick={() => navigate('/')}
        >
          {t('thread.back')}
        </button>
        {threadQuery.data && (
          <div className="text-xs text-[var(--theme-muted)] opacity-50">
            {t('thread.lastActivity', {
              time: formatDistanceToNow(new Date(threadQuery.data.lastActivityAt), {
                addSuffix: true,
              }),
            })}
          </div>
        )}
      </div>

      <div
        className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${theme.card}`}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-[var(--theme-border)]" />
        {threadQuery.isLoading && <div>{t('common.loading')}</div>}
              {threadQuery.isError && <div className="text-sm text-red-600">{t('thread.error')}</div>}
              {threadQuery.data && (
                <>
                  <ThreadCardHeader
              thread={threadQuery.data}
              isEditing={isEditingThread}
              editingThreadCategories={editingThreadCategories}
              isPinPending={pinThreadMutation.isPending}
              isUnpinPending={unpinThreadMutation.isPending}
              isHidePending={hideThreadMutation.isPending}
              labels={{
                pin: t('home.pin'),
                unpin: t('home.unpin'),
                edit: t('common.edit'),
                archive: t('common.archive'),
              }}
              onTogglePin={() => {
                if (threadQuery.data.pinned) {
                  unpinThreadMutation.mutate(threadQuery.data.id)
                } else {
                  pinThreadMutation.mutate(threadQuery.data.id)
                }
              }}
              onStartEdit={() => threadActions.startEditThread(threadQuery.data)}
              onToggleMute={() => {
                if (!threadQuery.data.body) {
                  return
                }
                toggleThreadMuteMutation.mutate({
                  threadId: threadQuery.data.id,
                  body: toggleMutedText(threadQuery.data.body),
                  categoryNames: threadQuery.data.categories.map((item) => item.name),
                })
              }}
              onHide={() => hideThreadMutation.mutate(threadQuery.data.id)}
              onEditingCategoryToggle={threadActions.toggleEditingCategory}
            />
            <div className="mt-8 pl-3 text-sm font-semibold">
              {(() => {
                const isThreadBodyMuted = isMutedText(threadQuery.data.body)
                const rawBody = threadQuery.data.body
                  ? (isThreadBodyMuted ? stripMutedText(threadQuery.data.body) : threadQuery.data.body)
                  : null
                const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : threadQuery.data.title
                return (
                  <>
                    <span
                      className={
                        isThreadBodyMuted
                          ? 'text-[var(--theme-muted)] opacity-50 line-through'
                          : 'text-[var(--theme-ink)]'
                      }
                    >
                      {displayTitle}
                    </span>
                  </>
                )
              })()}
            </div>
            {isEditingThread ? (
              <ThreadEditor
                value={editingThreadBody}
                onChange={threadActions.setEditingThreadBody}
                onSave={() =>
                  updateThreadMutation.mutate({
                    threadId: threadQuery.data.id,
                    body: editingThreadBody,
                    categoryNames: editingThreadCategories,
                  })
                }
                onCancel={() => threadActions.cancelEditThread(threadQuery.data)}
                categories={categoriesQuery.data ?? []}
                selectedCategories={editingThreadCategories}
                editingCategoryInput={editingCategoryInput}
                isCreateCategoryPending={createCategoryMutation.isPending}
                isSaving={updateThreadMutation.isPending}
                buttonSize="md"
                onToggleCategory={threadActions.toggleEditingCategory}
                onCategoryInputChange={threadActions.setEditingCategoryInput}
                onCategoryCancel={() => {
                  threadActions.setEditingCategoryInput('')
                  threadActions.setIsAddingEditingCategory(false)
                }}
                onCategorySubmit={submitCategory}
                labels={{
                  save: t('common.save'),
                  saving: t('common.loading'),
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
              threadQuery.data.body &&
              (() => {
                const isBodyMuted = isMutedText(threadQuery.data.body)
                const normalizedBody = isBodyMuted
                  ? stripMutedText(threadQuery.data.body)
                  : threadQuery.data.body
                const displayTitle = deriveTitleFromBody(normalizedBody)
                const body = getBodyWithoutTitle(displayTitle, normalizedBody)
                return body ? (
                  <p
                    className={`mt-2 whitespace-pre-wrap text-sm ${
                      isBodyMuted
                        ? 'text-[var(--theme-muted)] opacity-50 line-through'
                        : 'text-[var(--theme-ink)]'
                    }`}
                  >
                    {body}
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
                  index >= 0 && index < orderedEntries.length - 1
                    ? orderedEntries[index + 1]
                    : null
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
                      highlightQuery: '',
                    }}
                    ui={{
                      showMoveControls: true,
                      isEditing: editingEntryId === entry.id,
                      editingBody: editingEntryBody,
                      isReplyActive: activeReplyId === entry.id,
                      replyDraft: replyDrafts[entry.id] ?? '',
                      isEntryUpdatePending: updateEntryMutation.isPending,
                      isEntryHidePending: hideEntryMutation.isPending,
                      isEntryToggleMutePending: toggleEntryMuteMutation.isPending,
                      isEntryMovePending: moveEntryMutation.isPending,
                      isMoveUpDisabled: !canMoveUp,
                      isMoveDownDisabled: !canMoveDown,
                      isReplyPending: createEntryMutation.isPending,
                      replyComposerFocusId,
                      onReplyComposerFocusHandled: () => setReplyComposerFocusId(null),
                    }}
                    actions={{
                      onEditStart: () => entryActions.startEntryEdit(entry),
                      onEditChange: entryActions.setEditingEntryBody,
                      onEditCancel: entryActions.cancelEntryEdit,
                      onEditSave: () =>
                        updateEntryMutation.mutate({
                          entryId: entry.id,
                          body: editingEntryBody,
                        }),
                      onToggleMute: (nextBody) =>
                        toggleEntryMuteMutation.mutate({ entryId: entry.id, body: nextBody }),
                      onHide: () => hideEntryMutation.mutate(entry.id),
                      onMoveUp: () => {
                        if (!canMoveUp) {
                          return
                        }
                        moveEntryMutation.mutate({ entryId: entry.id, direction: 'UP' })
                      },
                      onMoveDown: () => {
                        if (!canMoveDown) {
                          return
                        }
                        moveEntryMutation.mutate({ entryId: entry.id, direction: 'DOWN' })
                      },
                      onReplyStart: () => {
                        setReplyComposerFocusId(`reply:${entry.id}`)
                        replyActions.startReply(entry.id)
                      },
                      onReplyChange: (value) => replyActions.updateReplyDraft(entry.id, value),
                      onReplyCancel: replyActions.cancelReply,
                      onReplySubmit: () => {
                        const body = replyDrafts[entry.id]?.trim()
                        if (!body) {
                          return
                        }
                        createEntryMutation.mutate({
                          body,
                          parentEntryId: entry.id,
                        })
                      },
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
              value={entryBody}
              placeholder={t('common.entryPlaceholder')}
              onChange={entryActions.setEntryBody}
              onSubmit={() =>
                createEntryMutation.mutate({
                  body: entryBody,
                })
              }
              isSubmitting={createEntryMutation.isPending}
              labels={{ submit: t('common.addEntry'), submitting: t('common.loading') }}
              handleTextareaInput={handleTextareaInput}
              resizeTextarea={resizeTextarea}
              focusId={id ? `entry:${id}` : undefined}
              activeFocusId={entryComposerFocusId}
              onFocusHandled={() => setEntryComposerFocusId(null)}
            />
            <div className="mt-2 text-xs text-[var(--theme-muted)] opacity-50 sm:mt-4">
              {t('home.lastActivity', {
                time: formatDistanceToNow(new Date(threadQuery.data.lastActivityAt), {
                  addSuffix: true,
                }),
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
