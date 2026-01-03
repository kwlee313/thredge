import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addEntry,
  createCategory,
  createThread,
  deleteCategory,
  fetchCategories,
  fetchThreadFeed,
  searchThreads,
} from '../../lib/api'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useTextareaAutosize } from '../../hooks/useTextareaAutosize'
import { buildEntryDepthMap } from '../../lib/entryDepth'
import { toggleMutedText } from '../../lib/mutedText'
import { CategoryInlineCreator } from '../CategoryInlineCreator'
import { CategoryFilterBar } from './CategoryFilterBar'
import { DateFilter } from './DateFilter'
import { ThreadCard } from './ThreadCard'
import { useDateFilter } from '../../hooks/useDateFilter'
import { useThreadActions } from '../../hooks/useThreadActions'

type HomeFeedProps = {
  username: string
}

const UNCATEGORIZED_TOKEN = '__uncategorized__'

export function HomeFeed({ username }: HomeFeedProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [threadBody, setThreadBody] = useState('')
  const [newThreadCategories, setNewThreadCategories] = useState<string[]>([])
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingThreadBody, setEditingThreadBody] = useState('')
  const [editingThreadCategories, setEditingThreadCategories] = useState<string[]>([])
  const [editingCategoryInput, setEditingCategoryInput] = useState('')
  const [isAddingEditingCategory, setIsAddingEditingCategory] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEntryBody, setEditingEntryBody] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeComposerTab, setActiveComposerTab] = useState<'new' | 'search'>('new')

  const normalizedSearchQuery = useDebouncedValue(searchQuery.trim(), 250)
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize({
    deps: [threadBody, editingThreadBody, editingEntryBody, entryDrafts, replyDrafts],
  })

  const {
    selectedDate,
    setSelectedDate,
    selectedDateLabel,
    dateInputValue,
    parseDateInput,
    shiftDateByDays,
    isSameCalendarDate,
  } = useDateFilter(i18n.language)

  const threadsQuery = useQuery({
    queryKey: ['threads', 'feed'],
    queryFn: fetchThreadFeed,
  })

  const searchThreadsQuery = useQuery({
    queryKey: ['threads', 'search', normalizedSearchQuery],
    queryFn: () => searchThreads(normalizedSearchQuery),
    enabled: Boolean(normalizedSearchQuery),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const createThreadMutation = useMutation({
    mutationFn: () => createThread(threadBody || null, newThreadCategories),
    onSuccess: async () => {
      setThreadBody('')
      setNewThreadCategories([])
      setNewCategoryInput('')
      setIsAddingNewCategory(false)
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: ({ name }: { name: string; target?: 'new' | 'edit' }) => createCategory(name),
    onSuccess: async (created, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      const target = variables.target ?? 'new'
      if (target === 'edit') {
        setEditingThreadCategories((prev) =>
          prev.includes(created.name) ? prev : [...prev, created.name],
        )
        setEditingCategoryInput('')
        setIsAddingEditingCategory(false)
      } else {
        setNewThreadCategories((prev) =>
          prev.includes(created.name) ? prev : [...prev, created.name],
        )
        setNewCategoryInput('')
        setIsAddingNewCategory(false)
      }
    },
  })

  const submitCategory = (target: 'new' | 'edit') => {
    const name = (target === 'new' ? newCategoryInput : editingCategoryInput).trim()
    if (!name) {
      return
    }
    createCategoryMutation.mutate({ name, target })
  }

  const addEntryMutation = useMutation({
    mutationFn: ({
      threadId,
      body,
      parentEntryId,
    }: {
      threadId: string
      body: string
      parentEntryId?: string
    }) => addEntry(threadId, body, parentEntryId),
    onSuccess: async (_, variables) => {
      if (variables.parentEntryId) {
        setReplyDrafts((prev) => ({ ...prev, [variables.parentEntryId as string]: '' }))
        setActiveReplyId(null)
      } else {
        setEntryDrafts((prev) => ({ ...prev, [variables.threadId]: '' }))
      }
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
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
    invalidate: {
      feed: true,
      search: true,
      hiddenThreads: true,
      hiddenEntries: true,
    },
    onThreadUpdated: (threadId) => {
      if (editingThreadId !== threadId) {
        return
      }
      setEditingThreadId(null)
      setEditingThreadBody('')
      setEditingThreadCategories([])
      setEditingCategoryInput('')
      setIsAddingEditingCategory(false)
    },
    onThreadHidden: (threadId) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.filter((thread) => thread.id !== threadId)
      })
    },
    onThreadPinned: (updated) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        const next = data.map((thread) =>
          thread.id === updated.id ? { ...thread, pinned: true } : thread,
        )
        return next.sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1
          }
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
        })
      })
    },
    onThreadUnpinned: (updated) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        const next = data.map((thread) =>
          thread.id === updated.id ? { ...thread, pinned: false } : thread,
        )
        return next.sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1
          }
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
        })
      })
    },
    onEntryUpdated: (entryId, body) => {
      if (editingEntryId === entryId) {
        setEditingEntryId(null)
        setEditingEntryBody('')
      }
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.map((thread) => ({
          ...thread,
          entries: thread.entries.map((entry) =>
            entry.id === entryId ? { ...entry, body } : entry,
          ),
        }))
      })
    },
    onEntryHidden: (entryId) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.map((thread) => ({
          ...thread,
          entries: thread.entries.filter((entry) => entry.id !== entryId),
        }))
      })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => deleteCategory(id),
    onSuccess: async (_, variables) => {
      setSelectedCategories((prev) => prev.filter((item) => item !== variables.name))
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })


  const filteredThreads = useMemo(() => {
    const data = normalizedSearchQuery ? searchThreadsQuery.data ?? [] : threadsQuery.data ?? []
    const dateFiltered = selectedDate
      ? data.filter((thread) => isSameCalendarDate(new Date(thread.createdAt), selectedDate))
      : data
    if (selectedCategories.length === 0) {
      return dateFiltered
    }
    const hasUncategorizedSelected = selectedCategories.includes(UNCATEGORIZED_TOKEN)
    const selectedNormalized = selectedCategories
      .filter((name) => name !== UNCATEGORIZED_TOKEN)
      .map((name) => name.trim().toLowerCase())
    return dateFiltered.filter((thread) => {
      const threadNames = thread.categories.map((item) => item.name.trim().toLowerCase())
      const matchesCategory =
        selectedNormalized.length > 0 && selectedNormalized.some((name) => threadNames.includes(name))
      const matchesUncategorized = hasUncategorizedSelected && thread.categories.length === 0
      return matchesCategory || matchesUncategorized
    })
  }, [
    threadsQuery.data,
    searchThreadsQuery.data,
    selectedCategories,
    selectedDate,
    normalizedSearchQuery,
  ])

  const buildCategoryCounts = (threads: { categories: { name: string }[] }[]) => {
    const counts = new Map<string, number>()
    let uncategorizedCount = 0
    threads.forEach((thread) => {
      if (thread.categories.length === 0) {
        uncategorizedCount += 1
        return
      }
      thread.categories.forEach((category) => {
        counts.set(category.name, (counts.get(category.name) ?? 0) + 1)
      })
    })
    return { counts, uncategorizedCount }
  }

  const categoryCounts = useMemo(() => {
    const searchData = normalizedSearchQuery ? searchThreadsQuery.data ?? [] : threadsQuery.data ?? []
    const dateFiltered = selectedDate
      ? searchData.filter((thread) => isSameCalendarDate(new Date(thread.createdAt), selectedDate))
      : searchData
    const totalData = threadsQuery.data ?? []
    return {
      display: buildCategoryCounts(dateFiltered),
      total: buildCategoryCounts(totalData),
    }
  }, [threadsQuery.data, searchThreadsQuery.data, selectedDate, normalizedSearchQuery])

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              className={`rounded-full border px-3 py-1 transition-all ${
                activeComposerTab === 'new'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
              type="button"
              onClick={() => setActiveComposerTab('new')}
            >
              {t('home.newThread')}
            </button>
            <button
              className={`rounded-full border px-3 py-1 transition-all ${
                activeComposerTab === 'search'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
              type="button"
              onClick={() => setActiveComposerTab('search')}
            >
              {t('home.searchTab')}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {t('home.signedInAs', { username })}
          </div>
        </div>
        {activeComposerTab === 'new' ? (
          <form
            className="mt-2 space-y-2 sm:mt-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!threadBody.trim()) {
                return
              }
              createThreadMutation.mutate()
            }}
          >
            <textarea
              className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={t('home.threadBodyPlaceholder')}
              value={threadBody}
              onChange={(event) => setThreadBody(event.target.value)}
              onInput={handleTextareaInput}
              data-autoresize="true"
              ref={(element) => resizeTextarea(element)}
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {categoriesQuery.data?.map((category) => {
                  const isSelected = newThreadCategories.includes(category.name)
                  return (
                    <button
                      key={category.id}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        isSelected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 text-gray-700'
                      }`}
                      type="button"
                      onClick={() => {
                        setNewThreadCategories((prev) =>
                          isSelected
                            ? prev.filter((item) => item !== category.name)
                            : [...prev, category.name],
                        )
                      }}
                    >
                      {category.name}
                    </button>
                  )
                })}
                {categoriesQuery.data?.length === 0 && (
                  <div className="text-xs text-gray-500">{t('home.noCategories')}</div>
                )}
                <div className="flex items-center">
                  <CategoryInlineCreator
                    isOpen={isAddingNewCategory}
                    value={newCategoryInput}
                    placeholder={t('home.categoryPlaceholder')}
                    addLabel={t('home.addCategory')}
                    cancelLabel={t('home.cancel')}
                    disabled={createCategoryMutation.isPending}
                    onOpen={() => setIsAddingNewCategory(true)}
                    onValueChange={setNewCategoryInput}
                    onSubmit={() => submitCategory('new')}
                    onCancel={() => {
                      setNewCategoryInput('')
                      setIsAddingNewCategory(false)
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={createThreadMutation.isPending}
            >
              {createThreadMutation.isPending ? t('home.loading') : t('home.createThread')}
            </button>
          </form>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <div className="relative w-full max-w-sm">
              <input
                className="w-full rounded-md border border-gray-300 px-6 py-2 pr-12 text-sm"
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-700"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 sm:w-auto"
              type="button"
            >
              {t('home.searchTab')}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            {normalizedSearchQuery
              ? t('home.searchTitle', {
                  query: normalizedSearchQuery,
                  count: filteredThreads.length,
                })
              : selectedDateLabel
                ? t('home.threadsTitleForDate', { date: selectedDateLabel })
                : t('home.threadsTitle')}
          </div>
          <DateFilter
            selectedDate={selectedDate}
            dateInputValue={dateInputValue}
            labels={{
              allDates: t('home.allDates'),
              prevDay: t('home.prevDay'),
              nextDay: t('home.nextDay'),
              dateInputLabel: t('home.dateInputLabel'),
            }}
            onClear={() => setSelectedDate(null)}
            onPrev={() => {
              const base = selectedDate ?? new Date()
              setSelectedDate(shiftDateByDays(base, -1))
            }}
            onNext={() => {
              const base = selectedDate ?? new Date()
              setSelectedDate(shiftDateByDays(base, 1))
            }}
            onInputChange={(value) => setSelectedDate(parseDateInput(value))}
          />
        </div>
        <div className="mt-2 space-y-8 sm:mt-4 sm:space-y-8">
          <CategoryFilterBar
            categories={
              categoriesQuery.data?.map((category) => {
                const count = categoryCounts.display.counts.get(category.name) ?? 0
                const totalCount = categoryCounts.total.counts.get(category.name) ?? 0
                return {
                  id: category.id,
                  name: category.name,
                  count,
                  totalCount,
                  canDelete: threadsQuery.isSuccess && totalCount === 0,
                }
              }) ?? []
            }
            selectedCategories={selectedCategories}
            uncategorizedCount={categoryCounts.display.uncategorizedCount}
            uncategorizedToken={UNCATEGORIZED_TOKEN}
            labels={{
              title: t('home.categories'),
              uncategorized: t('home.uncategorized'),
              noCategories: t('home.noCategories'),
              deleteCategory: t('home.deleteCategory'),
            }}
            onToggleUncategorized={() => {
              setSelectedCategories((prev) =>
                prev.includes(UNCATEGORIZED_TOKEN)
                  ? prev.filter((item) => item !== UNCATEGORIZED_TOKEN)
                  : [...prev, UNCATEGORIZED_TOKEN],
              )
            }}
            onToggleCategory={(name) => {
              setSelectedCategories((prev) =>
                prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
              )
            }}
            onDeleteCategory={(id, name) => {
              const shouldDelete = window.confirm(t('home.deleteCategoryConfirm', { name }))
              if (!shouldDelete) {
                return
              }
              deleteCategoryMutation.mutate({ id, name })
            }}
          />
          {(normalizedSearchQuery ? searchThreadsQuery : threadsQuery).isLoading && (
            <div className="text-sm text-gray-600">{t('home.loading')}</div>
          )}
          {(normalizedSearchQuery ? searchThreadsQuery : threadsQuery).isError && (
            <div className="text-sm text-red-600">{t('home.error')}</div>
          )}
          {filteredThreads.map((thread, index) => {
            const theme = [
              {
                card: 'border-gray-200 bg-white',
                entry: 'border-gray-100 bg-gray-50',
              },
              {
                card: 'border-zinc-200 bg-white',
                entry: 'border-zinc-100 bg-zinc-50',
              },
              {
                card: 'border-slate-200 bg-white',
                entry: 'border-slate-100 bg-slate-50',
              },
            ][index % 3]
            const entryDepth = buildEntryDepthMap(thread.entries)
            const isEditing = editingThreadId === thread.id

            return (
              <ThreadCard
                key={thread.id}
                thread={thread}
                theme={theme}
                categories={categoriesQuery.data ?? []}
                normalizedSearchQuery={normalizedSearchQuery}
                entryDepth={entryDepth}
                linkTo={`/threads/${thread.id}`}
                isEditing={isEditing}
                editingThreadBody={editingThreadBody}
                editingThreadCategories={editingThreadCategories}
                editingCategoryInput={editingCategoryInput}
                isAddingEditingCategory={isAddingEditingCategory}
                editingEntryId={editingEntryId}
                editingEntryBody={editingEntryBody}
                activeReplyId={activeReplyId}
                replyDrafts={replyDrafts}
                newEntryDraft={entryDrafts[thread.id] ?? ''}
                isUpdateThreadPending={updateThreadMutation.isPending}
                isCreateCategoryPending={createCategoryMutation.isPending}
                isPinPending={pinThreadMutation.isPending}
                isUnpinPending={unpinThreadMutation.isPending}
                isHidePending={hideThreadMutation.isPending}
                isEntryUpdatePending={updateEntryMutation.isPending}
                isEntryHidePending={hideEntryMutation.isPending}
                isEntryToggleMutePending={toggleEntryMuteMutation.isPending}
                isReplyPending={addEntryMutation.isPending}
                isAddEntryPending={addEntryMutation.isPending}
                t={t}
                onStartEdit={() => {
                  setEditingThreadId(thread.id)
                  setEditingThreadBody(thread.body ?? '')
                  setEditingThreadCategories(thread.categories.map((item) => item.name))
                  setEditingCategoryInput('')
                  setIsAddingEditingCategory(false)
                }}
                onCancelEdit={() => {
                  setEditingThreadId(null)
                  setEditingThreadBody('')
                  setEditingThreadCategories([])
                  setEditingCategoryInput('')
                  setIsAddingEditingCategory(false)
                }}
                onEditingThreadBodyChange={setEditingThreadBody}
                onEditingCategoryToggle={(categoryName) => {
                  setEditingThreadCategories((prev) =>
                    prev.includes(categoryName)
                      ? prev.filter((item) => item !== categoryName)
                      : [...prev, categoryName],
                  )
                }}
                onEditingCategoryInputChange={setEditingCategoryInput}
                onEditingCategoryOpen={() => setIsAddingEditingCategory(true)}
                onEditingCategoryCancel={() => {
                  setEditingCategoryInput('')
                  setIsAddingEditingCategory(false)
                }}
                onEditingCategorySubmit={() => submitCategory('edit')}
                onSaveEdit={() =>
                  updateThreadMutation.mutate({
                    threadId: thread.id,
                    body: editingThreadBody,
                    categoryNames: editingThreadCategories,
                  })
                }
                onTogglePin={() => {
                  if (thread.pinned) {
                    unpinThreadMutation.mutate(thread.id)
                  } else {
                    pinThreadMutation.mutate(thread.id)
                  }
                }}
                onToggleMute={() => {
                  if (!thread.body) {
                    return
                  }
                  toggleThreadMuteMutation.mutate({
                    threadId: thread.id,
                    body: toggleMutedText(thread.body),
                    categoryNames: thread.categories.map((item) => item.name),
                  })
                }}
                onHide={() => hideThreadMutation.mutate(thread.id)}
                onEntryEditStart={(entryId, body) => {
                  setEditingEntryId(entryId)
                  setEditingEntryBody(body)
                }}
                onEntryEditChange={setEditingEntryBody}
                onEntryEditCancel={() => {
                  setEditingEntryId(null)
                  setEditingEntryBody('')
                }}
                onEntryEditSave={(entryId) => {
                  if (!editingEntryBody.trim()) {
                    return
                  }
                  updateEntryMutation.mutate({
                    entryId,
                    body: editingEntryBody,
                  })
                }}
                onEntryToggleMute={(entryId, body) => {
                  if (!body) {
                    return
                  }
                  toggleEntryMuteMutation.mutate({ entryId, body })
                }}
                onEntryHide={(entryId) => hideEntryMutation.mutate(entryId)}
                onReplyStart={(entryId) => {
                  setActiveReplyId(entryId)
                  setReplyDrafts((prev) => ({
                    ...prev,
                    [entryId]: prev[entryId] ?? '',
                  }))
                }}
                onReplyChange={(entryId, value) =>
                  setReplyDrafts((prev) => ({
                    ...prev,
                    [entryId]: value,
                  }))
                }
                onReplyCancel={() => setActiveReplyId(null)}
                onReplySubmit={(entryId) => {
                  const body = replyDrafts[entryId]?.trim()
                  if (!body) {
                    return
                  }
                  addEntryMutation.mutate({
                    threadId: thread.id,
                    body,
                    parentEntryId: entryId,
                  })
                }}
                onNewEntryChange={(value) =>
                  setEntryDrafts((prev) => ({
                    ...prev,
                    [thread.id]: value,
                  }))
                }
                onNewEntrySubmit={() => {
                  const body = entryDrafts[thread.id]?.trim()
                  if (!body) {
                    return
                  }
                  addEntryMutation.mutate({ threadId: thread.id, body })
                }}
                handleTextareaInput={handleTextareaInput}
                resizeTextarea={resizeTextarea}
              />
            )
          })}
          {!(normalizedSearchQuery ? searchThreadsQuery : threadsQuery).isLoading &&
            filteredThreads.length === 0 && (
            <div className="text-sm text-gray-600">
              {normalizedSearchQuery
                ? t('home.emptySearch')
                : selectedDateLabel
                  ? t('home.emptyThreadsForDate', { date: selectedDateLabel })
                  : t('home.emptyThreads')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
