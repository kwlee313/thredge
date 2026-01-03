import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createThread,
  fetchCategories,
  fetchCategoryCounts,
  fetchThreadFeedPage,
  searchThreadsPage,
  type FeedFilterOptions,
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
import { THREAD_LIST_INVALIDATIONS } from '../../hooks/threadActionPresets'
import { useHomeFeedState } from '../../hooks/useHomeFeedState'
import { useCategoryMutations } from '../../hooks/useCategoryMutations'
import { queryKeys } from '../../lib/queryKeys'
import { useEntryActions } from '../../hooks/useEntryActions'
import { uiTokens } from '../../lib/uiTokens'
import {
  removeEntryFromFeed,
  removeThreadFromFeed,
  setThreadPinnedInFeed,
  updateEntryInFeed,
} from '../../lib/threadCache'

type HomeFeedProps = {
  username: string
}

const UNCATEGORIZED_TOKEN = '__uncategorized__'

export function HomeFeed({ username }: HomeFeedProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { state, actions } = useHomeFeedState()
  const {
    threadBody,
    newThreadCategories,
    newCategoryInput,
    isAddingNewCategory,
    selectedCategories,
    entryDrafts,
    replyDrafts,
    activeReplyId,
    editingThreadId,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
    isAddingEditingCategory,
    editingEntryId,
    editingEntryBody,
    searchQuery,
    activeComposerTab,
  } = state
  const {
    thread: threadActions,
    entry: entryActions,
    reply: replyActions,
    ui: uiActions,
  } = actions

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

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
  })

  const categoryCountsQuery = useQuery({
    queryKey: queryKeys.categoriesCounts,
    queryFn: fetchCategoryCounts,
  })

  // Build filter options for server-side filtering
  const feedFilters: FeedFilterOptions = useMemo(() => {
    const filters: FeedFilterOptions = {}
    if (selectedDate) {
      filters.date = selectedDate.toISOString().split('T')[0]
    }
    if (selectedCategories.length > 0) {
      // Convert category names to IDs for server filter
      const categoryMap = new Map(
        (categoriesQuery.data ?? []).map((c) => [c.name, c.id]),
      )
      const ids = selectedCategories.map((name) =>
        name === UNCATEGORIZED_TOKEN ? name : (categoryMap.get(name) ?? name),
      )
      filters.categoryIds = ids
    }
    return filters
  }, [selectedDate, selectedCategories, categoriesQuery.data])

  const hasFilters = Boolean(feedFilters.date || feedFilters.categoryIds?.length)

  const threadsQuery = useInfiniteQuery({
    queryKey: hasFilters
      ? queryKeys.threads.feedFiltered(feedFilters.date, feedFilters.categoryIds)
      : queryKeys.threads.feed,
    queryFn: ({ pageParam }) => fetchThreadFeedPage(pageParam, undefined, hasFilters ? feedFilters : undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
  })

  const searchThreadsQuery = useInfiniteQuery({
    queryKey: queryKeys.threads.search(normalizedSearchQuery),
    queryFn: ({ pageParam }) => searchThreadsPage(normalizedSearchQuery, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: Boolean(normalizedSearchQuery),
  })

  const createThreadMutation = useMutation({
    mutationFn: () => createThread(threadBody || null, newThreadCategories),
    onSuccess: async () => {
      threadActions.setThreadBody('')
      threadActions.setNewThreadCategories([])
      threadActions.setNewCategoryInput('')
      threadActions.setIsAddingNewCategory(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.searchRoot })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriesCounts })
    },
  })

  const { createCategoryMutation } = useCategoryMutations({
    onCreateSuccess: (created, variables) => {
      const target = variables.target === 'edit' ? 'edit' : 'new'
      if (target === 'edit') {
        threadActions.setEditingThreadCategories((prev) =>
          prev.includes(created.name) ? prev : [...prev, created.name],
        )
        threadActions.setEditingCategoryInput('')
        threadActions.setIsAddingEditingCategory(false)
      } else {
        threadActions.setNewThreadCategories((prev) =>
          prev.includes(created.name) ? prev : [...prev, created.name],
        )
        threadActions.setNewCategoryInput('')
        threadActions.setIsAddingNewCategory(false)
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

  const { createEntryMutation } = useEntryActions({
    invalidateTargets: ['feed', 'search'],
    onEntryCreated: (_created, variables) => {
      if (variables.parentEntryId) {
        replyActions.updateReplyDraft(variables.parentEntryId, '')
        replyActions.cancelReply()
      } else {
        entryActions.updateEntryDraft(variables.threadId, '')
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
    invalidateTargets: THREAD_LIST_INVALIDATIONS,
    onThreadUpdated: (threadId) => {
      if (editingThreadId !== threadId) {
        return
      }
      threadActions.cancelEditThread()
    },
    onThreadHidden: (threadId) => {
      removeThreadFromFeed(queryClient, threadId)
    },
    onThreadPinned: (updated) => {
      setThreadPinnedInFeed(queryClient, updated, true)
    },
    onThreadUnpinned: (updated) => {
      setThreadPinnedInFeed(queryClient, updated, false)
    },
    onEntryUpdated: (entryId, body) => {
      if (editingEntryId === entryId) {
        entryActions.cancelEntryEdit()
      }
      updateEntryInFeed(queryClient, entryId, body)
    },
    onEntryHidden: (entryId) => {
      removeEntryFromFeed(queryClient, entryId)
    },
  })

  const { deleteCategoryMutation } = useCategoryMutations({
    invalidateThreadsFeed: true,
    invalidateThreadsSearch: true,
    onDeleteSuccess: (variables) => {
      const removedName = variables.name as string
      if (!removedName) {
        return
      }
      threadActions.setSelectedCategories((prev) => prev.filter((item) => item !== removedName))
    },
  })

  const threadItems = useMemo(() => {
    const pages = threadsQuery.data?.pages ?? []
    return pages.flatMap((page) => page.items)
  }, [threadsQuery.data])

  const searchItems = useMemo(() => {
    const pages = searchThreadsQuery.data?.pages ?? []
    return pages.flatMap((page) => page.items)
  }, [searchThreadsQuery.data])

  // When using server-side filtering, just use the data directly
  // Only apply client-side filtering when searching (search doesn't support filters yet)
  const filteredThreads = useMemo(() => {
    if (normalizedSearchQuery) {
      // Search results still need client-side filtering for now
      const dateFiltered = selectedDate
        ? searchItems.filter((thread) => isSameCalendarDate(new Date(thread.createdAt), selectedDate))
        : searchItems
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
    }
    // Server-side filtering: data is already filtered
    return threadItems
  }, [
    threadItems,
    searchItems,
    selectedCategories,
    selectedDate,
    normalizedSearchQuery,
    isSameCalendarDate,
  ])

  const entryDepthByThreadId = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    filteredThreads.forEach((thread) => {
      map.set(thread.id, buildEntryDepthMap(thread.entries))
    })
    return map
  }, [filteredThreads])

  const categoryCountsById = useMemo(() => {
    const counts = categoryCountsQuery.data?.counts ?? []
    return new Map(counts.map((item) => [item.id, item.count]))
  }, [categoryCountsQuery.data])

  const visibleCategoryCounts = useMemo(() => {
    if (!normalizedSearchQuery) {
      return null
    }

    const counts = new Map<string, number>()
    let uncategorized = 0

    filteredThreads.forEach((thread) => {
      if (thread.categories.length === 0) {
        uncategorized++
      } else {
        thread.categories.forEach((cat) => {
          counts.set(cat.id, (counts.get(cat.id) ?? 0) + 1)
        })
      }
    })

    return { counts, uncategorized }
  }, [normalizedSearchQuery, filteredThreads])

  const activeThreadsQuery = normalizedSearchQuery ? searchThreadsQuery : threadsQuery

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className={uiTokens.card.surface}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              className={`rounded-full border px-3 py-1 transition-all ${activeComposerTab === 'new'
                ? uiTokens.button.pillActive
                : uiTokens.button.pillInactive
                }`}
              type="button"
              onClick={() => uiActions.setActiveComposerTab('new')}
            >
              {t('home.newThread')}
            </button>
            <button
              className={`rounded-full border px-3 py-1 transition-all ${activeComposerTab === 'search'
                ? uiTokens.button.pillActive
                : uiTokens.button.pillInactive
                }`}
              type="button"
              onClick={() => uiActions.setActiveComposerTab('search')}
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
              onChange={(event) => threadActions.setThreadBody(event.target.value)}
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
                      className={`rounded-full border px-3 py-1 text-xs ${isSelected
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700'
                        }`}
                      type="button"
                      onClick={() => {
                        threadActions.setNewThreadCategories((prev) =>
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
                    cancelLabel={t('common.cancel')}
                    disabled={createCategoryMutation.isPending}
                    onOpen={() => threadActions.setIsAddingNewCategory(true)}
                    onValueChange={threadActions.setNewCategoryInput}
                    onSubmit={() => submitCategory('new')}
                    onCancel={() => {
                      threadActions.setNewCategoryInput('')
                      threadActions.setIsAddingNewCategory(false)
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              className={uiTokens.button.primaryMd}
              type="submit"
              disabled={createThreadMutation.isPending}
            >
              {createThreadMutation.isPending ? t('common.loading') : t('home.createThread')}
            </button>
          </form>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <div className="relative w-full max-w-sm">
              <input
                className={`${uiTokens.input.base} ${uiTokens.input.paddingMdWide} pr-12`}
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => uiActions.setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-700"
                  type="button"
                  onClick={() => uiActions.setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <button
              className={`w-full sm:w-auto ${uiTokens.button.secondaryMd}`}
              type="button"
              onClick={() => uiActions.setActiveComposerTab('search')}
            >
              {t('home.searchTab')}
            </button>
          </div>
        )}
      </div>

      <div className={uiTokens.card.surface}>
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
                const globalCount = categoryCountsById.get(category.id) ?? 0
                const displayCount = visibleCategoryCounts
                  ? visibleCategoryCounts.counts.get(category.id) ?? 0
                  : globalCount

                return {
                  id: category.id,
                  name: category.name,
                  count: displayCount,
                  canDelete: categoryCountsQuery.isSuccess && globalCount === 0,
                }
              }) ?? []
            }
            selectedCategories={selectedCategories}
            uncategorizedCount={
              visibleCategoryCounts
                ? visibleCategoryCounts.uncategorized
                : categoryCountsQuery.data?.uncategorizedCount ?? 0
            }
            uncategorizedToken={UNCATEGORIZED_TOKEN}
            labels={{
              title: t('home.categories'),
              uncategorized: t('home.uncategorized'),
              noCategories: t('home.noCategories'),
              deleteCategory: t('home.deleteCategory'),
            }}
            onToggleUncategorized={() => {
              threadActions.setSelectedCategories((prev) =>
                prev.includes(UNCATEGORIZED_TOKEN)
                  ? prev.filter((item) => item !== UNCATEGORIZED_TOKEN)
                  : [...prev, UNCATEGORIZED_TOKEN],
              )
            }}
            onToggleCategory={(name) => {
              threadActions.setSelectedCategories((prev) =>
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
          {activeThreadsQuery.isLoading && (
            <div className="text-sm text-gray-600">{t('common.loading')}</div>
          )}
          {activeThreadsQuery.isError && (
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
            const entryDepth = entryDepthByThreadId.get(thread.id) ?? new Map()
            const isEditing = editingThreadId === thread.id

            return (
              <ThreadCard
                key={thread.id}
                data={{
                  thread,
                  theme,
                  categories: categoriesQuery.data ?? [],
                  normalizedSearchQuery,
                  entryDepth,
                  linkTo: `/threads/${thread.id}`,
                }}
                ui={{
                  isEditing,
                  editingThreadBody,
                  editingThreadCategories,
                  editingCategoryInput,
                  isAddingEditingCategory,
                  editingEntryId,
                  editingEntryBody,
                  activeReplyId,
                  replyDrafts,
                  newEntryDraft: entryDrafts[thread.id] ?? '',
                  isUpdateThreadPending: updateThreadMutation.isPending,
                  isCreateCategoryPending: createCategoryMutation.isPending,
                  isPinPending: pinThreadMutation.isPending,
                  isUnpinPending: unpinThreadMutation.isPending,
                  isHidePending: hideThreadMutation.isPending,
                  isEntryUpdatePending: updateEntryMutation.isPending,
                  isEntryHidePending: hideEntryMutation.isPending,
                  isEntryToggleMutePending: toggleEntryMuteMutation.isPending,
                  isReplyPending: createEntryMutation.isPending,
                  isAddEntryPending: createEntryMutation.isPending,
                }}
                actions={{
                  onStartEdit: () => threadActions.startEditThread(thread),
                  onCancelEdit: threadActions.cancelEditThread,
                  onEditingThreadBodyChange: threadActions.setEditingThreadBody,
                  onEditingCategoryToggle: threadActions.toggleEditingCategory,
                  onEditingCategoryInputChange: threadActions.setEditingCategoryInput,
                  onEditingCategoryOpen: () => threadActions.setIsAddingEditingCategory(true),
                  onEditingCategoryCancel: () => {
                    threadActions.setEditingCategoryInput('')
                    threadActions.setIsAddingEditingCategory(false)
                  },
                  onEditingCategorySubmit: () => submitCategory('edit'),
                  onSaveEdit: () =>
                    updateThreadMutation.mutate({
                      threadId: thread.id,
                      body: editingThreadBody,
                      categoryNames: editingThreadCategories,
                    }),
                  onTogglePin: () => {
                    if (thread.pinned) {
                      unpinThreadMutation.mutate(thread.id)
                    } else {
                      pinThreadMutation.mutate(thread.id)
                    }
                  },
                  onToggleMute: () => {
                    if (!thread.body) {
                      return
                    }
                    toggleThreadMuteMutation.mutate({
                      threadId: thread.id,
                      body: toggleMutedText(thread.body),
                      categoryNames: thread.categories.map((item) => item.name),
                    })
                  },
                  onHide: () => hideThreadMutation.mutate(thread.id),
                  onEntryEditStart: (entryId, body) =>
                    entryActions.startEntryEdit({ id: entryId, body }),
                  onEntryEditChange: entryActions.setEditingEntryBody,
                  onEntryEditCancel: entryActions.cancelEntryEdit,
                  onEntryEditSave: (entryId) => {
                    if (!editingEntryBody.trim()) {
                      return
                    }
                    updateEntryMutation.mutate({
                      entryId,
                      body: editingEntryBody,
                    })
                  },
                  onEntryToggleMute: (entryId, body) => {
                    if (!body) {
                      return
                    }
                    toggleEntryMuteMutation.mutate({ entryId, body })
                  },
                  onEntryHide: (entryId) => hideEntryMutation.mutate(entryId),
                  onReplyStart: (entryId) => replyActions.startReply(entryId),
                  onReplyChange: (entryId, value) => replyActions.updateReplyDraft(entryId, value),
                  onReplyCancel: replyActions.cancelReply,
                  onReplySubmit: (entryId) => {
                    const body = replyDrafts[entryId]?.trim()
                    if (!body) {
                      return
                    }
                    createEntryMutation.mutate({
                      threadId: thread.id,
                      body,
                      parentEntryId: entryId,
                    })
                  },
                  onNewEntryChange: (value) => entryActions.updateEntryDraft(thread.id, value),
                  onNewEntrySubmit: () => {
                    const body = entryDrafts[thread.id]?.trim()
                    if (!body) {
                      return
                    }
                    createEntryMutation.mutate({ threadId: thread.id, body })
                  },
                }}
                helpers={{
                  t,
                  handleTextareaInput,
                  resizeTextarea,
                }}
              />
            )
          })}
          {!activeThreadsQuery.isLoading && filteredThreads.length === 0 && (
            <div className="text-sm text-gray-600">
              {normalizedSearchQuery
                ? t('home.emptySearch')
                : selectedDateLabel
                  ? t('home.emptyThreadsForDate', { date: selectedDateLabel })
                  : t('home.emptyThreads')}
            </div>
          )}
          {activeThreadsQuery.hasNextPage && (
            <button
              className={uiTokens.button.secondarySm}
              type="button"
              onClick={() => activeThreadsQuery.fetchNextPage()}
              disabled={activeThreadsQuery.isFetchingNextPage}
            >
              {activeThreadsQuery.isFetchingNextPage ? t('common.loading') : t('home.loadMore')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
