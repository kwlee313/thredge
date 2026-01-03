import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo } from 'react'
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
import { useThreadDetailState } from '../hooks/useThreadDetailState'
import { buildEntryDepthMap } from '../lib/entryDepth'
import { deriveTitleFromBody, getBodyWithoutTitle } from '../lib/threadText'
import { isMutedText, stripMutedText, toggleMutedText } from '../lib/mutedText'
import { ThreadCardHeader } from '../components/home/ThreadCardHeader'
import { ThreadEditor } from '../components/home/ThreadEditor'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { queryKeys } from '../lib/queryKeys'
import { useEntryActions } from '../hooks/useEntryActions'
import { uiTokens } from '../lib/uiTokens'

export function ThreadDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, actions } = useThreadDetailState()
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
    isAddingEditingCategory,
  } = state
  const {
    setEntryBody,
    setEditingEntryBody,
    setEditingThreadBody,
    setEditingThreadCategories,
    setEditingCategoryInput,
    setIsAddingEditingCategory,
    setIsEditingThread,
    syncThread,
    startEditThread,
    cancelEditThread,
    toggleEditingCategory,
    startEntryEdit,
    cancelEntryEdit,
    startReply,
    cancelReply,
    updateReplyDraft,
  } = actions
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize({
    deps: [editingThreadBody, editingEntryBody, replyDrafts, entryBody],
  })

  const threadQuery = useQuery({
    queryKey: queryKeys.thread.detail(id),
    queryFn: () => fetchThread(id ?? ''),
    enabled: Boolean(id),
  })

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    enabled: threadQuery.isSuccess,
  })

  const { createCategoryMutation } = useCategoryMutations({
    onCreateSuccess: (created) => {
      setEditingThreadCategories((prev) =>
        prev.includes(created.name) ? prev : [...prev, created.name],
      )
      setEditingCategoryInput('')
      setIsAddingEditingCategory(false)
    },
  })

  const submitCategory = () => {
    const name = editingCategoryInput.trim()
    if (!name) {
      return
    }
    createCategoryMutation.mutate({ name })
  }

  const { createEntryMutation } = useEntryActions({
    threadId: id ?? undefined,
    invalidateTargets: ['thread', 'feed'],
    onEntryCreated: (_created, variables) => {
      if (variables.parentEntryId) {
        updateReplyDraft(variables.parentEntryId, '')
        cancelReply()
      } else {
        setEntryBody('')
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
      setIsEditingThread(false)
      setEditingCategoryInput('')
      setIsAddingEditingCategory(false)
    },
    onThreadHidden: () => {
      navigate('/')
    },
    onEntryUpdated: (entryId, _body) => {
      if (editingEntryId === entryId) {
        cancelEntryEdit()
      }
    },
  })

  useEffect(() => {
    if (threadQuery.data) {
      syncThread(threadQuery.data)
    }
  }, [threadQuery.data])

  const entryDepth = useMemo(() => {
    const entries = threadQuery.data?.entries ?? []
    return buildEntryDepthMap(entries)
  }, [threadQuery.data?.entries])

  if (!id) {
    return (
      <div className="rounded-lg border bg-white p-4 text-gray-900">
        {t('thread.missing')}
      </div>
    )
  }

  const theme = {
    card: 'border-gray-200 bg-white',
    entry: 'border-gray-100 bg-gray-50',
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center justify-between">
        <button
          className="text-sm text-gray-600"
          type="button"
          onClick={() => navigate('/')}
        >
          {t('thread.back')}
        </button>
        {threadQuery.data && (
          <div className="text-xs text-gray-500">
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
        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-gray-100" />
        {threadQuery.isLoading && <div>{t('thread.loading')}</div>}
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
                edit: t('home.edit'),
                archive: t('home.archive'),
              }}
              onTogglePin={() => {
                if (threadQuery.data.pinned) {
                  unpinThreadMutation.mutate(threadQuery.data.id)
                } else {
                  pinThreadMutation.mutate(threadQuery.data.id)
                }
              }}
              onStartEdit={() => startEditThread(threadQuery.data)}
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
              onEditingCategoryToggle={toggleEditingCategory}
            />
            <div className="mt-6 pl-3 text-sm font-semibold">
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
                        isThreadBodyMuted ? 'text-gray-400 line-through' : 'text-gray-900'
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
                onChange={setEditingThreadBody}
                onSave={() =>
                  updateThreadMutation.mutate({
                    threadId: threadQuery.data.id,
                    body: editingThreadBody,
                    categoryNames: editingThreadCategories,
                  })
                }
                onCancel={() => cancelEditThread(threadQuery.data)}
                categories={categoriesQuery.data ?? []}
                selectedCategories={editingThreadCategories}
                editingCategoryInput={editingCategoryInput}
                isAddingCategory={isAddingEditingCategory}
                isCreateCategoryPending={createCategoryMutation.isPending}
                isSaving={updateThreadMutation.isPending}
                buttonSize="md"
                onToggleCategory={toggleEditingCategory}
                onCategoryInputChange={setEditingCategoryInput}
                onCategoryOpen={() => setIsAddingEditingCategory(true)}
                onCategoryCancel={() => {
                  setEditingCategoryInput('')
                  setIsAddingEditingCategory(false)
                }}
                onCategorySubmit={submitCategory}
                labels={{
                  save: t('home.save'),
                  saving: t('home.loading'),
                  cancel: t('home.cancel'),
                  categoryPlaceholder: t('home.categoryPlaceholder'),
                  addCategory: t('home.addCategory'),
                  cancelCategory: t('home.cancel'),
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
                      isBodyMuted ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {body}
                  </p>
                ) : null
              })()
            )}
            <div className="mt-2 space-y-2 sm:mt-6">
              {threadQuery.data.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  depth={entryDepth.get(entry.id) ?? 1}
                  themeEntryClass={theme.entry}
                  highlightQuery=""
                  isEditing={editingEntryId === entry.id}
                  editingBody={editingEntryBody}
                  isReplyActive={activeReplyId === entry.id}
                  replyDraft={replyDrafts[entry.id] ?? ''}
                  isEntryUpdatePending={updateEntryMutation.isPending}
                  isEntryHidePending={hideEntryMutation.isPending}
                  isEntryToggleMutePending={toggleEntryMuteMutation.isPending}
                  isReplyPending={createEntryMutation.isPending}
                  onEditStart={() => startEntryEdit(entry)}
                  onEditChange={setEditingEntryBody}
                  onEditCancel={cancelEntryEdit}
                  onEditSave={() =>
                    updateEntryMutation.mutate({
                      entryId: entry.id,
                      body: editingEntryBody,
                    })
                  }
                  onToggleMute={(nextBody) =>
                    toggleEntryMuteMutation.mutate({ entryId: entry.id, body: nextBody })
                  }
                  onHide={() => hideEntryMutation.mutate(entry.id)}
                  onReplyStart={() => startReply(entry.id)}
                  onReplyChange={(value) => updateReplyDraft(entry.id, value)}
                  onReplyCancel={cancelReply}
                  onReplySubmit={() => {
                    const body = replyDrafts[entry.id]?.trim()
                    if (!body) {
                      return
                    }
                    createEntryMutation.mutate({
                      threadId: threadQuery.data.id,
                      body,
                      parentEntryId: entry.id,
                    })
                  }}
                  handleTextareaInput={handleTextareaInput}
                  resizeTextarea={resizeTextarea}
                />
              ))}
              {threadQuery.data.entries.length === 0 && (
                <div className="text-sm text-gray-600">{t('thread.empty')}</div>
              )}
            </div>
            <form
              className="mt-2 space-y-2 sm:mt-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!entryBody.trim()) {
                  return
                }
                createEntryMutation.mutate({
                  threadId: threadQuery.data.id,
                  body: entryBody,
                })
              }}
            >
              <textarea
                className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('home.entryPlaceholder')}
                value={entryBody}
                onChange={(event) => setEntryBody(event.target.value)}
                onInput={handleTextareaInput}
                data-autoresize="true"
                ref={(element) => resizeTextarea(element)}
              />
              <button
                className={uiTokens.button.primaryMd}
                type="submit"
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? t('home.loading') : t('home.addEntry')}
              </button>
            </form>
            <div className="mt-2 text-xs text-gray-500 sm:mt-4">
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
