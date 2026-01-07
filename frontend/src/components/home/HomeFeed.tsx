import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import xIcon from '../../assets/x.svg?raw'
import { CategoryFilterBar } from './CategoryFilterBar'
import { DateFilter } from './DateFilter'
import { ThreadCard } from './ThreadCard'
import { useDateFilter } from '../../hooks/useDateFilter'
import { InlineIcon } from '../common/InlineIcon'
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { state, actions } = useHomeFeedState()
  const [entryComposerFocusId, setEntryComposerFocusId] = useState<string | null>(null)
  const [replyComposerFocusId, setReplyComposerFocusId] = useState<string | null>(null)
  const {
    threadBody,
    selectedCategories,
    entryDrafts,
    replyDrafts,
    activeReplyId,
    editingThreadId,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
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

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  const normalizedSearchQuery = searchQuery.trim()
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize() // Use it LOCALLY for the main input only

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

  const validCategoryNames = useMemo(() => {
    return new Set((categoriesQuery.data ?? []).map((category) => category.name))
  }, [categoriesQuery.data])

  const normalizedSelectedCategories = useMemo(() => {
    return selectedCategories.filter(
      (name) => name === UNCATEGORIZED_TOKEN || validCategoryNames.has(name),
    )
  }, [selectedCategories, validCategoryNames])
  const newThreadCategoryNames = useMemo(
    () => normalizedSelectedCategories.filter((name) => name !== UNCATEGORIZED_TOKEN),
    [normalizedSelectedCategories],
  )

  useEffect(() => {
    if (!categoriesQuery.isSuccess) {
      return
    }
    if (normalizedSelectedCategories.length !== selectedCategories.length) {
      threadActions.setSelectedCategories(normalizedSelectedCategories)
    }
  }, [
    categoriesQuery.isSuccess,
    normalizedSelectedCategories,
    selectedCategories,
    threadActions,
  ])

  // Build filter options for server-side filtering
  const feedFilters: FeedFilterOptions = useMemo(() => {
    const filters: FeedFilterOptions = {}
    if (selectedDate) {
      filters.date = selectedDate.toISOString().split('T')[0]
    }
    if (normalizedSelectedCategories.length > 0) {
      // Convert category names to IDs for server filter
      const categoryMap = new Map(
        (categoriesQuery.data ?? []).map((c) => [c.name, c.id]),
      )
      const ids = normalizedSelectedCategories.flatMap((name) => {
        if (name === UNCATEGORIZED_TOKEN) {
          return [name]
        }
        const id = categoryMap.get(name)
        return id ? [id] : []
      })
      filters.categoryIds = ids
    }
    return filters
  }, [selectedDate, normalizedSelectedCategories, categoriesQuery.data])

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
    queryKey: queryKeys.threads.search(normalizedSearchQuery, feedFilters.categoryIds),
    queryFn: ({ pageParam }) => searchThreadsPage(normalizedSearchQuery, pageParam, undefined, feedFilters.categoryIds),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: Boolean(normalizedSearchQuery),
  })

  const createThreadMutation = useMutation({
    mutationFn: () => createThread(threadBody || null, newThreadCategoryNames),
    onSuccess: async (created) => {
      threadActions.setThreadBody('')
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.searchRoot })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriesCounts })
      navigate(`/threads/${created.id}`)
    },
  })

  const { createCategoryMutation } = useCategoryMutations({
    onCreateSuccess: (created, variables) => {
      const target = variables.target === 'edit' ? 'edit' : 'filter'
      if (target === 'edit') {
        threadActions.setEditingThreadCategories((prev) =>
          prev.includes(created.name) ? prev : [...prev, created.name],
        )
        threadActions.setEditingCategoryInput('')
        threadActions.setIsAddingEditingCategory(false)
        return
      }
      threadActions.setSelectedCategories((prev) =>
        prev.includes(created.name) ? prev : [...prev, created.name],
      )
    },
  })

  const submitEditingCategory = () => {
    const name = editingCategoryInput.trim()
    if (!name) {
      return
    }
    createCategoryMutation.mutate({ name, target: 'edit' })
  }

  const { createEntryMutation, moveEntryToMutation } = useEntryActions({
    invalidateTargets: ['feed', 'search'],
    onEntryCreated: (_created, variables) => {
      if (variables.parentEntryId) {
        replyActions.updateReplyDraft(variables.parentEntryId, '')
        replyActions.cancelReply()
      } else {
        entryActions.updateEntryDraft(variables.threadId, '')
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
  // Only apply client-side filtering when searching if we want to filter by date (server search doesn't support date yet)
  const filteredThreads = useMemo(() => {
    if (normalizedSearchQuery) {
      // Search results still need client-side filtering for date
      const dateFiltered = selectedDate
        ? searchItems.filter((thread) => isSameCalendarDate(new Date(thread.createdAt), selectedDate))
        : searchItems
      return dateFiltered
    }
    // Server-side filtering: data is already filtered
    return threadItems
  }, [
    threadItems,
    searchItems,
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

  const activeThreadsQuery = normalizedSearchQuery ? searchThreadsQuery : threadsQuery
  const categoryTitle = useMemo(() => {
    if (selectedCategories.length === 0) {
      return null
    }
    const labels = selectedCategories.map((name) =>
      name === UNCATEGORIZED_TOKEN ? t('home.uncategorized') : name,
    )
    if (labels.length === 1) {
      return t('home.threadsTitleForCategory', { category: labels[0] })
    }
    return t('home.threadsTitleForCategories', { count: labels.length })
  }, [selectedCategories, t])

  return (
    <div className="space-y-14 sm:space-y-16">
      <CategoryFilterBar
        categories={
          categoriesQuery.data?.map((category) => {
            const globalCount = categoryCountsById.get(category.id) ?? 0

            return {
              id: category.id,
              name: category.name,
              count: globalCount,
              canDelete: categoryCountsQuery.isSuccess && globalCount === 0,
            }
          }) ?? []
        }
        selectedCategories={selectedCategories}
        uncategorizedCount={
          categoryCountsQuery.data?.uncategorizedCount ?? 0
        }
        uncategorizedToken={UNCATEGORIZED_TOKEN}
        labels={{
          title: t('home.categories'),
          uncategorized: t('home.uncategorized'),
          noCategories: t('home.noCategories'),
          deleteCategory: t('home.deleteCategory'),
          categorySearchPlaceholder: t('home.categorySearchPlaceholder'),
          loadMore: t('home.loadMore'),
          addCategory: t('home.addCategory'),
          cancel: t('common.cancel'),
        }}
        isCreateCategoryPending={createCategoryMutation.isPending}
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
        onCreateCategory={(name) => {
          createCategoryMutation.mutate({ name, target: 'filter' })
        }}
      />
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
          <div className="text-xs text-[var(--theme-muted)]">
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
              className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
              placeholder={t('home.threadBodyPlaceholder')}
              value={threadBody}
              onChange={(event) => threadActions.setThreadBody(event.target.value)}
              onInput={handleTextareaInput}
              data-autoresize="true"
              ref={(element) => resizeTextarea(element)}
            />
            <button
              className={uiTokens.button.primaryMd}
              type="submit"
              disabled={createThreadMutation.isPending}
            >
              {createThreadMutation.isPending ? t('common.loading') : t('home.createThread')}
            </button>
          </form>
                ) : (
                  <form
                    className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center"
                    onSubmit={(event) => {
                      event.preventDefault()
                      uiActions.setSearchQuery(localSearchQuery)
                    }}
                  >
                    <div className="relative w-full max-w-sm">
                      <input
                        className={`${uiTokens.input.base} ${uiTokens.input.paddingMdWide} pr-12`}
                        placeholder={t('home.searchPlaceholder')}
                        value={localSearchQuery}
                        onChange={(event) => setLocalSearchQuery(event.target.value)}
                      />
                      {localSearchQuery && (
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--theme-muted)] hover:opacity-80"
                          type="button"
                          onClick={() => {
                            setLocalSearchQuery('')
                            uiActions.setSearchQuery('')
                          }}
                          aria-label="Clear search"
                        >
                          <InlineIcon svg={xIcon} className="[&>svg]:h-3 [&>svg]:w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      className={`w-full sm:w-auto ${uiTokens.button.secondaryMd}`}
                      type="submit"
                    >
                      {t('home.searchTab')}
                    </button>
                  </form>
                )}      </div>
      <div className={uiTokens.card.surface}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            {normalizedSearchQuery
              ? t('home.searchTitle', {
                query: normalizedSearchQuery,
                count: filteredThreads.length,
              })
              : categoryTitle
                ? categoryTitle
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
        <div className="mt-6 space-y-20 sm:mt-8 sm:space-y-24">
          {activeThreadsQuery.isLoading && (
            <div className="text-sm text-[var(--theme-muted)]">
              {t('common.loading')}
            </div>
          )}
          {activeThreadsQuery.isError && (
            <div className="text-sm text-red-600">{t('home.error')}</div>
          )}
          {filteredThreads.map((thread, index) => {
            const cardBg = thread.pinned ? 'bg-[var(--theme-base)]' : 'bg-[var(--theme-surface)]'
            const theme = {
              card: `border-[var(--theme-border)] ${cardBg}`,
              entry: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
            }
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
                  isEntryMovePending: moveEntryToMutation.isPending,
                  isReplyPending: createEntryMutation.isPending,
                  isAddEntryPending: createEntryMutation.isPending,
                  entryComposerFocusId,
                  onEntryComposerFocusHandled: () => setEntryComposerFocusId(null),
                  replyComposerFocusId,
                  onReplyComposerFocusHandled: () => setReplyComposerFocusId(null),
                }}
                actions={{
                  onStartEdit: () => threadActions.startEditThread(thread),
                  onCancelEdit: threadActions.cancelEditThread,
                  onEditingThreadBodyChange: threadActions.setEditingThreadBody,
                  onEditingCategoryToggle: threadActions.toggleEditingCategory,
                  onEditingCategoryInputChange: threadActions.setEditingCategoryInput,
                  onEditingCategoryCancel: () => {
                    threadActions.setEditingCategoryInput('')
                  },
                  onEditingCategorySubmit: submitEditingCategory,
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
                  onEntryMoveTo: async (entryId, targetEntryId, position, threadId) => {
                    await moveEntryToMutation.mutateAsync({
                      entryId,
                      targetEntryId,
                      position,
                      threadId,
                    })
                  },
                  onReplyStart: (entryId) => {
                    setReplyComposerFocusId(`reply:${entryId}`)
                    replyActions.startReply(entryId)
                  },
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
            <div className="text-sm text-[var(--theme-muted)]">
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
