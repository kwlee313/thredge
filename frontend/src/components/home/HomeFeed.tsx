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
  const [categorySearch, setCategorySearch] = useState('')
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0)
  const [isCategorySearchFocused, setIsCategorySearchFocused] = useState(false)
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false)
  const categoryPreviewLimit = 10
  const {
    threadBody,
    newThreadCategories,
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

  const trimmedCategorySearch = categorySearch.trim()
  const normalizedCategorySearch = trimmedCategorySearch.toLowerCase()
  const filteredCategories = useMemo(() => {
    const categories = categoriesQuery.data ?? []
    if (!normalizedCategorySearch) {
      return categories
    }
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedCategorySearch),
    )
  }, [categoriesQuery.data, normalizedCategorySearch])
  const visibleCategories =
    isCategorySearchFocused || isCategoryListExpanded
      ? filteredCategories
      : filteredCategories.slice(0, categoryPreviewLimit)
  const shouldShowCategoryExpand =
    !isCategorySearchFocused &&
    !isCategoryListExpanded &&
    filteredCategories.length > categoryPreviewLimit
  const hasExactCategoryMatch = useMemo(() => {
    if (!normalizedCategorySearch) {
      return false
    }
    return (categoriesQuery.data ?? []).some(
      (category) => category.name.toLowerCase() === normalizedCategorySearch,
    )
  }, [categoriesQuery.data, normalizedCategorySearch])

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setFocusedCategoryIndex(0)
      return
    }
    setFocusedCategoryIndex((prev) =>
      Math.max(0, Math.min(prev, filteredCategories.length - 1)),
    )
  }, [filteredCategories])

  const validCategoryNames = useMemo(() => {
    return new Set((categoriesQuery.data ?? []).map((category) => category.name))
  }, [categoriesQuery.data])

  const normalizedSelectedCategories = useMemo(() => {
    return selectedCategories.filter(
      (name) => name === UNCATEGORIZED_TOKEN || validCategoryNames.has(name),
    )
  }, [selectedCategories, validCategoryNames])

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
    mutationFn: () => createThread(threadBody || null, newThreadCategories),
    onSuccess: async (created) => {
      threadActions.setThreadBody('')
      threadActions.setNewThreadCategories([])
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.searchRoot })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriesCounts })
      navigate(`/threads/${created.id}`)
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
        setCategorySearch('')
      }
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
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="w-[110px] rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
                  placeholder={t('home.categorySearchPlaceholder')}
                  value={categorySearch}
                  onFocus={() => {
                    setIsCategorySearchFocused(true)
                    if (filteredCategories.length > 0) {
                      setFocusedCategoryIndex(0)
                    }
                  }}
                  onBlur={() => setIsCategorySearchFocused(false)}
                  onChange={(event) => {
                    setIsCategoryListExpanded(false)
                    setCategorySearch(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') {
                      event.preventDefault()
                      setFocusedCategoryIndex((prev) =>
                        filteredCategories.length === 0
                          ? 0
                          : (prev + 1) % filteredCategories.length,
                      )
                      return
                    }
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault()
                      setFocusedCategoryIndex((prev) =>
                        filteredCategories.length === 0
                          ? 0
                          : (prev - 1 + filteredCategories.length) % filteredCategories.length,
                      )
                      return
                    }
                    if (event.key !== 'Enter') {
                      return
                    }
                    const match = filteredCategories[focusedCategoryIndex]
                    if (!match) {
                      return
                    }
                    event.preventDefault()
                    threadActions.setNewThreadCategories((prev) =>
                      prev.includes(match.name)
                        ? prev.filter((item) => item !== match.name)
                        : [...prev, match.name],
                    )
                    if (normalizedCategorySearch) {
                      setCategorySearch('')
                    }
                  }}
                />
                {visibleCategories.map((category, index) => {
                  const isSelected = newThreadCategories.includes(category.name)
                  return (
                    <button
                      key={category.id}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        focusedCategoryIndex === index
                          ? 'outline outline-2 outline-[var(--theme-primary)] outline-offset-1'
                          : ''
                      } ${isSelected
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                        : 'border-[var(--theme-border)] text-[var(--theme-ink)]'
                        }`}
                      type="button"
                      tabIndex={-1}
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
                {shouldShowCategoryExpand && (
                  <button
                    className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                    type="button"
                    onClick={() => setIsCategoryListExpanded(true)}
                  >
                    ... {t('home.loadMore')}
                  </button>
                )}
                {categoriesQuery.data?.length === 0 && (
                  <div className="text-xs text-[var(--theme-muted)]">
                    {t('home.noCategories')}
                  </div>
                )}
                {normalizedCategorySearch && !hasExactCategoryMatch && (
                  <div className="flex items-center gap-1">
                    <button
                      className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                      type="button"
                      onClick={() => {
                        createCategoryMutation.mutate({
                          name: trimmedCategorySearch,
                          target: 'new',
                        })
                      }}
                      disabled={createCategoryMutation.isPending}
                    >
                      '{trimmedCategorySearch}' {t('home.addCategory')}
                    </button>
                    <button
                      className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
                      type="button"
                      onClick={() => setCategorySearch('')}
                      disabled={createCategoryMutation.isPending}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--theme-muted)] hover:opacity-80"
                type="button"
                  onClick={() => uiActions.setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <InlineIcon svg={xIcon} className="[&>svg]:h-3 [&>svg]:w-3" />
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
            <div className="text-sm text-[var(--theme-muted)]">
              {t('common.loading')}
            </div>
          )}
          {activeThreadsQuery.isError && (
            <div className="text-sm text-red-600">{t('home.error')}</div>
          )}
          {filteredThreads.map((thread, index) => {
            const theme = [
              {
                card: 'border-[var(--theme-border)] bg-[var(--theme-surface)]',
                entry: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
              },
              {
                card: 'border-[var(--theme-border)] bg-[var(--theme-surface)]',
                entry: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
              },
              {
                card: 'border-[var(--theme-border)] bg-[var(--theme-surface)]',
                entry: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
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
