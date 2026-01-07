import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchCategories,
  fetchThread,
} from '../lib/api'
import { useTextareaAutosize } from '../hooks/useTextareaAutosize'
import { useThreadActions } from '../hooks/useThreadActions'
import { THREAD_DETAIL_INVALIDATIONS } from '../hooks/threadActionPresets'
import { EntryCard } from '../components/home/EntryCard'
import type { EntryDragState } from '../components/home/types'
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
import { highlightMatches } from '../lib/highlightMatches'

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

  const { createEntryMutation, moveEntryToMutation } = useEntryActions({
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
      const position =
        overPosition === 'before' ? 'BEFORE' : overPosition === 'after' ? 'AFTER' : 'CHILD'
      await moveEntryToMutation.mutateAsync({
        entryId: activeEntryId,
        targetEntryId: overEntryId,
        position,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reply move failed.'
      setDragError(message)
    }
  }

  const handleDragStart = (entryId: string) => {
    if (moveEntryToMutation.isPending) {
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

  if (!id) {
    return (
      <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-[var(--theme-ink)]">
        {t('thread.missing')}
      </div>
    )
  }

  const theme = {
    card: `border-[var(--theme-border)] ${
      threadQuery.data?.pinned ? 'bg-[var(--theme-base)]' : 'bg-[var(--theme-surface)]'
    }`,
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
                  onHide={() => hideThreadMutation.mutate(threadQuery.data.id)}
                  onEditingCategoryToggle={threadActions.toggleEditingCategory}
                />
            <div className="mt-8 pl-3 text-sm font-semibold">
              {(() => {
                const isThreadBodyMuted = isMutedText(threadQuery.data.body)
                const rawBody = threadQuery.data.body
                  ? (isThreadBodyMuted
                      ? stripMutedText(threadQuery.data.body)
                      : threadQuery.data.body)
                  : null
                const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : threadQuery.data.title
                return (
                  <span
                    className={
                      isThreadBodyMuted
                        ? 'text-[var(--theme-muted)] opacity-50 line-through'
                        : 'text-[var(--theme-ink)]'
                    }
                  >
                    {displayTitle}
                  </span>
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
                onComplete={() => {
                  if (!threadQuery.data.body) {
                    return
                  }
                  toggleThreadMuteMutation.mutate({
                    threadId: threadQuery.data.id,
                    body: toggleMutedText(threadQuery.data.body),
                    categoryNames: threadQuery.data.categories.map((item) => item.name),
                  })
                }}
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
                  complete: '완료',
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
                    {highlightMatches(body, '')}
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
                    rendered.push(renderDropIndicator(dropDepth, `drop-${entry.id}`))
                  }
                  rendered.push(
                    <EntryCard
                      key={entry.id}
                      data={{
                        entry,
                        depth,
                        themeEntryClass: theme.entry,
                        highlightQuery: '',
                      }}
                      ui={{
                        isEditing: editingEntryId === entry.id,
                        editingBody: editingEntryBody,
                        isReplyActive: activeReplyId === entry.id,
                        replyDraft: replyDrafts[entry.id] ?? '',
                        isEntryUpdatePending: updateEntryMutation.isPending,
                        isEntryHidePending: hideEntryMutation.isPending,
                        isEntryToggleMutePending: toggleEntryMuteMutation.isPending,
                        isEntryMovePending: moveEntryToMutation.isPending,
                        isReplyPending: createEntryMutation.isPending,
                        dragState,
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
                        onDragStart: handleDragStart,
                        onDragEnd: handleDragEnd,
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
                    />,
                  )
                })
                if (renderDropIndex !== null && renderDropIndex === rendered.length) {
                  rendered.push(renderDropIndicator(dropDepth, `drop-tail`))
                }
                return rendered
              })()}
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
