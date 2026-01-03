import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  addEntry,
  createCategory,
  createThread,
  deleteCategory,
  fetchCategories,
  fetchMe,
  fetchThreadFeed,
  hideEntry,
  hideThread,
  login,
  pinThread,
  searchThreads,
  unpinThread,
  updateEntry,
  updateThread,
} from '../lib/api'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import pinIcon from '../assets/pin.svg'
import pinFilledIcon from '../assets/pin-filled.svg'
import eraserIcon from '../assets/eraser.svg'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('user')
  const [password, setPassword] = useState('user')
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
  const [editingThreadCategoriesId, setEditingThreadCategoriesId] = useState<string | null>(null)
  const [editingThreadCategories, setEditingThreadCategories] = useState<string[]>([])
  const [editingCategoryInput, setEditingCategoryInput] = useState('')
  const [isAddingEditingCategory, setIsAddingEditingCategory] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEntryBody, setEditingEntryBody] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeComposerTab, setActiveComposerTab] = useState<'new' | 'search'>('new')
  const UNCATEGORIZED_TOKEN = '__uncategorized__'
  const isMutedText = (text?: string | null) =>
    Boolean(text && text.startsWith('~~') && text.endsWith('~~') && text.length > 4)
  const stripMutedText = (text: string) => text.slice(2, -2)
  const toggleMutedText = (text: string) => (isMutedText(text) ? stripMutedText(text) : `~~${text}~~`)

  const highlightMatches = (text: string, query: string): ReactNode => {
    if (!query) {
      return text
    }
    const normalizedText = text.toLowerCase()
    const normalizedQuery = query.toLowerCase()
    if (!normalizedQuery) {
      return text
    }
    const parts: ReactNode[] = []
    let startIndex = 0
    let matchIndex = normalizedText.indexOf(normalizedQuery, startIndex)
    while (matchIndex !== -1) {
      if (matchIndex > startIndex) {
        parts.push(text.slice(startIndex, matchIndex))
      }
      const matchText = text.slice(matchIndex, matchIndex + normalizedQuery.length)
      parts.push(
        <mark key={`${startIndex}-${matchIndex}`} className="rounded bg-yellow-200 px-0.5">
          {matchText}
        </mark>,
      )
      startIndex = matchIndex + normalizedQuery.length
      matchIndex = normalizedText.indexOf(normalizedQuery, startIndex)
    }
    if (startIndex < text.length) {
      parts.push(text.slice(startIndex))
    }
    return parts
  }
  const newCategoryInputRef = useRef<HTMLInputElement | null>(null)
  const editingCategoryInputRef = useRef<HTMLInputElement | null>(null)

  const MAX_TEXTAREA_HEIGHT = 240

  const formatDateLabel = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseDateInput = (value: string) => {
    if (!value) {
      return null
    }
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) {
      return null
    }
    return new Date(year, month - 1, day)
  }

  const shiftDateByDays = (date: Date, amount: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)

  const isSameCalendarDate = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()

  const normalizedSearchQuery = useDebouncedValue(searchQuery.trim(), 250)

  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) {
      return
    }
    element.style.height = 'auto'
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)
    element.style.height = `${nextHeight}px`
    element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }

  const handleTextareaInput = (event: FormEvent<HTMLTextAreaElement>) => {
    resizeTextarea(event.currentTarget)
  }

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLTextAreaElement>('textarea[data-autoresize="true"]')
        .forEach((element) => resizeTextarea(element))
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [threadBody, editingThreadBody, editingEntryBody, entryDrafts, replyDrafts])

  useEffect(() => {
    if (isAddingNewCategory) {
      newCategoryInputRef.current?.focus()
    }
  }, [isAddingNewCategory])

  useEffect(() => {
    if (isAddingEditingCategory) {
      editingCategoryInputRef.current?.focus()
    }
  }, [isAddingEditingCategory])

  const authQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })

  const threadsQuery = useQuery({
    queryKey: ['threads', 'feed'],
    queryFn: fetchThreadFeed,
    enabled: authQuery.isSuccess,
  })

  const searchThreadsQuery = useQuery({
    queryKey: ['threads', 'search', normalizedSearchQuery],
    queryFn: () => searchThreads(normalizedSearchQuery),
    enabled: authQuery.isSuccess && Boolean(normalizedSearchQuery),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: authQuery.isSuccess,
  })

  const createThreadMutation = useMutation({
    mutationFn: () => {
      return createThread(threadBody || null, newThreadCategories)
    },
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
      const target = variables.target ?? (editingThreadCategoriesId ? 'edit' : 'new')
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

  const updateThreadMutation = useMutation({
    mutationFn: ({
      threadId,
      body,
      categoryNames,
    }: {
      threadId: string
      body: string
      categoryNames: string[]
    }) => updateThread(threadId, body, categoryNames),
    onSuccess: async () => {
      setEditingThreadId(null)
      setEditingThreadBody('')
      setEditingThreadCategoriesId(null)
      setEditingThreadCategories([])
      setEditingCategoryInput('')
      setIsAddingEditingCategory(false)
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })

  const toggleThreadMuteMutation = useMutation({
    mutationFn: ({
      threadId,
      body,
      categoryNames,
    }: {
      threadId: string
      body: string
      categoryNames: string[]
    }) => updateThread(threadId, body, categoryNames),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (_, variables) => {
      setEditingEntryId(null)
      setEditingEntryBody('')
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.map((thread) => ({
          ...thread,
          entries: thread.entries.map((entry) =>
            entry.id === variables.entryId ? { ...entry, body: variables.body } : entry,
          ),
        }))
      })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })

  const toggleEntryMuteMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (_, variables) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.map((thread) => ({
          ...thread,
          entries: thread.entries.map((entry) =>
            entry.id === variables.entryId ? { ...entry, body: variables.body } : entry,
          ),
        }))
      })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
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

  const hideThreadMutation = useMutation({
    mutationFn: (threadId: string) => hideThread(threadId),
    onSuccess: async (_, threadId) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.filter((thread) => thread.id !== threadId)
      })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden'] })
    },
  })

  const hideEntryMutation = useMutation({
    mutationFn: (entryId: string) => hideEntry(entryId),
    onSuccess: async (_, entryId) => {
      queryClient.setQueryData(['threads', 'feed'], (data) => {
        if (!Array.isArray(data)) {
          return data
        }
        return data.map((thread) => ({
          ...thread,
          entries: thread.entries.filter((entry) => entry.id !== entryId),
        }))
      })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
      await queryClient.invalidateQueries({ queryKey: ['entries', 'hidden'] })
    },
  })

  const pinThreadMutation = useMutation({
    mutationFn: (threadId: string) => pinThread(threadId),
    onSuccess: async (updated) => {
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
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden'] })
    },
  })

  const unpinThreadMutation = useMutation({
    mutationFn: (threadId: string) => unpinThread(threadId),
    onSuccess: async (updated) => {
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
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden'] })
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

  const getBodyWithoutTitle = (title: string, body: string) => {
    const normalizedBody = body.replace(/\r\n/g, '\n')
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return normalizedBody.trim()
    }
    let remainder = normalizedBody
    if (remainder.startsWith(trimmedTitle)) {
      remainder = remainder.slice(trimmedTitle.length)
    } else {
      const trimmedBody = remainder.trimStart()
      if (trimmedBody.startsWith(trimmedTitle)) {
        remainder = trimmedBody.slice(trimmedTitle.length)
      }
    }
    return remainder.replace(/^\s+/, '').trimEnd()
  }

  const deriveTitleFromBody = (body: string) => {
    const normalizedBody = body.replace(/\r\n/g, '\n')
    const firstLine = normalizedBody.split('\n').find((line) => line.trim().length > 0) ?? ''
    const source = firstLine.trim() || normalizedBody.trim()
    return source.slice(0, 200)
  }

  const selectedDateLabel = selectedDate ? formatDateLabel(selectedDate) : null

  const buildEntryDepthMap = (
    entries: { id: string; parentEntryId?: string | null }[],
  ) => {
    const entryById = new Map(entries.map((entry) => [entry.id, entry]))
    const depthCache = new Map<string, number>()
    const getDepth = (entryId: string) => {
      const cached = depthCache.get(entryId)
      if (cached) {
        return cached
      }
      let depth = 1
      let currentId = entryById.get(entryId)?.parentEntryId ?? null
      while (currentId) {
        const parent = entryById.get(currentId)
        if (!parent) {
          break
        }
        depth += 1
        currentId = parent.parentEntryId ?? null
        if (depth >= 3) {
          break
        }
      }
      depthCache.set(entryId, depth)
      return depth
    }
    entries.forEach((entry) => {
      getDepth(entry.id)
    })
    return depthCache
  }

  return (
    <div className="space-y-2 sm:space-y-3">

      {!authQuery.isSuccess && (
        <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
          <div className="text-sm font-semibold">{t('home.loginTitle')}</div>
          <form
            className="mt-2 space-y-2 sm:mt-3 sm:space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              loginMutation.mutate()
            }}
          >
            <label className="block text-sm">
              <span className="text-gray-600">{t('home.username')}</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{t('home.password')}</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t('home.loading') : t('home.loginButton')}
            </button>
            {loginMutation.isError && (
              <div className="text-sm text-red-600">{t('home.loginError')}</div>
            )}
          </form>
        </div>
      )}

      {authQuery.isSuccess && (
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
                {t('home.signedInAs', { username: authQuery.data.username })}
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
                      {isAddingNewCategory ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            className="w-44 rounded-full border border-gray-300 px-3 py-1 text-xs transition-all"
                            placeholder={t('home.categoryPlaceholder')}
                            value={newCategoryInput}
                            onChange={(event) => setNewCategoryInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                event.stopPropagation()
                                submitCategory('new')
                              }
                              if (event.key === 'Escape') {
                                event.stopPropagation()
                                setNewCategoryInput('')
                                setIsAddingNewCategory(false)
                              }
                            }}
                            ref={newCategoryInputRef}
                            disabled={createCategoryMutation.isPending}
                          />
                          <button
                            className="flex h-7 items-center justify-center rounded-full border border-gray-300 px-2 text-[11px] font-semibold text-gray-700 transition-all"
                            type="button"
                            onClick={() => submitCategory('new')}
                            disabled={createCategoryMutation.isPending}
                          >
                            {t('home.addCategory')}
                          </button>
                          <button
                            className="flex h-7 items-center justify-center rounded-full border border-gray-300 px-2 text-[11px] font-semibold text-gray-700 transition-all"
                            type="button"
                            onClick={() => {
                              setNewCategoryInput('')
                              setIsAddingNewCategory(false)
                            }}
                            disabled={createCategoryMutation.isPending}
                          >
                            {t('home.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-700 transition-all"
                          type="button"
                          onClick={() => setIsAddingNewCategory(true)}
                        >
                          +
                        </button>
                      )}
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <button
                  className="rounded-full border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 transition-all"
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  disabled={!selectedDate}
                >
                  {t('home.allDates')}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    className="flex items-center justify-center px-2 py-1 text-xs font-semibold text-gray-600 transition-all hover:text-gray-900"
                    type="button"
                    onClick={() => {
                      const base = selectedDate ?? new Date()
                      setSelectedDate(shiftDateByDays(base, -1))
                    }}
                    aria-label={t('home.prevDay')}
                  >
                    {'<'}
                  </button>
                  <input
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                    type="date"
                    value={selectedDate ? formatDateInput(selectedDate) : ''}
                    onChange={(event) => {
                      setSelectedDate(parseDateInput(event.target.value))
                    }}
                    aria-label={t('home.dateInputLabel')}
                  />
                  <button
                    className="flex items-center justify-center px-2 py-1 text-xs font-semibold text-gray-600 transition-all hover:text-gray-900"
                    type="button"
                    onClick={() => {
                      const base = selectedDate ?? new Date()
                      setSelectedDate(shiftDateByDays(base, 1))
                    }}
                    aria-label={t('home.nextDay')}
                  >
                    {'>'}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-8 sm:mt-4 sm:space-y-8">
              <div className="rounded-md border border-gray-200 px-1.5 py-1 sm:px-3 sm:py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('home.categories')}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 sm:mt-2">
                  <button
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selectedCategories.includes(UNCATEGORIZED_TOKEN)
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700'
                    }`}
                    type="button"
                    onClick={() => {
                      setSelectedCategories((prev) =>
                        prev.includes(UNCATEGORIZED_TOKEN)
                          ? prev.filter((item) => item !== UNCATEGORIZED_TOKEN)
                          : [...prev, UNCATEGORIZED_TOKEN],
                      )
                    }}
                  >
                    {t('home.uncategorized')}{' '}
                    <span className="text-[10px] text-gray-500">
                      ({categoryCounts.display.uncategorizedCount})
                    </span>
                  </button>
                  {categoriesQuery.data?.map((category) => {
                    const isSelected = selectedCategories.includes(category.name)
                    const count = categoryCounts.display.counts.get(category.name) ?? 0
                    const totalCount = categoryCounts.total.counts.get(category.name) ?? 0
                    const canDelete = threadsQuery.isSuccess && totalCount === 0
                    return (
                      <div key={category.id} className="relative flex items-center">
                        <button
                          className={`rounded-full border px-3 py-1 text-xs ${
                            isSelected
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-300 text-gray-700'
                          }`}
                          type="button"
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              isSelected
                                ? prev.filter((item) => item !== category.name)
                                : [...prev, category.name],
                            )
                          }}
                        >
                          {category.name}{' '}
                          <span className="text-[10px] text-gray-500">({count})</span>
                        </button>
                        {canDelete && (
                          <button
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] text-gray-500 hover:text-gray-900"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              const shouldDelete = window.confirm(
                                t('home.deleteCategoryConfirm', { name: category.name }),
                              )
                              if (!shouldDelete) {
                                return
                              }
                              deleteCategoryMutation.mutate({
                                id: category.id,
                                name: category.name,
                              })
                            }}
                            disabled={deleteCategoryMutation.isPending}
                            aria-label={t('home.deleteCategory')}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {categoriesQuery.data?.length === 0 && (
                    <div className="text-xs text-gray-500">{t('home.noCategories')}</div>
                  )}
                </div>
              </div>
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
                const isThreadBodyMuted = isMutedText(thread.body)
                const rawBody =
                  thread.body ? (isThreadBodyMuted ? stripMutedText(thread.body) : thread.body) : null
                const displayTitle = rawBody ? deriveTitleFromBody(rawBody) : thread.title
                const isEditing = editingThreadId === thread.id

                return (
                  <div
                    key={thread.id}
                    className={`relative rounded-xl border pl-2 pr-1 pt-8 pb-1 shadow-sm sm:px-6 sm:py-5 ${theme.card}`}
                  >
                    <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full rounded-t-xl bg-gray-100" />
                    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            thread.pinned
                              ? 'border-gray-900 text-gray-900'
                              : 'border-gray-200 text-gray-400'
                          }`}
                          type="button"
                          onClick={() => {
                            if (thread.pinned) {
                              unpinThreadMutation.mutate(thread.id)
                            } else {
                              pinThreadMutation.mutate(thread.id)
                            }
                          }}
                          disabled={pinThreadMutation.isPending || unpinThreadMutation.isPending}
                          aria-label={thread.pinned ? t('home.unpin') : t('home.pin')}
                        >
                          <img
                            className="h-3.5 w-3.5"
                            src={thread.pinned ? pinFilledIcon : pinIcon}
                            alt=""
                          />
                        </button>
                        {isEditing
                          ? editingThreadCategories.map((categoryName) => (
                              <button
                                key={categoryName}
                                className="inline-flex rounded-full border border-gray-900 bg-gray-900 px-2 py-0.5 text-xs font-normal text-white"
                                type="button"
                                onClick={() => {
                                  setEditingThreadCategories((prev) =>
                                    prev.filter((item) => item !== categoryName),
                                  )
                                }}
                              >
                                {categoryName}
                              </button>
                            ))
                          : thread.categories.map((category) => (
                              <span
                                key={category.id}
                                className="inline-flex rounded-full border border-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600"
                              >
                                {category.name}
                              </span>
                            ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                          type="button"
                          onClick={() => {
                            setEditingThreadId(thread.id)
                            setEditingThreadBody(thread.body ?? '')
                            setEditingThreadCategoriesId(thread.id)
                            setEditingThreadCategories(thread.categories.map((item) => item.name))
                            setEditingCategoryInput('')
                            setIsAddingEditingCategory(false)
                          }}
                          aria-label={t('home.edit')}
                        >
                          <img className="h-3.5 w-3.5" src={eraserIcon} alt="" />
                        </button>
                        <button
                          className={`rounded-full border px-1 py-0 text-[9px] ${
                            isMutedText(thread.body)
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-400'
                          }`}
                          type="button"
                          onClick={() => {
                            if (!thread.body) {
                              return
                            }
                            toggleThreadMuteMutation.mutate({
                              threadId: thread.id,
                              body: toggleMutedText(thread.body),
                              categoryNames: thread.categories.map((item) => item.name),
                            })
                          }}
                          aria-label="Toggle strikethrough"
                        >
                          -
                        </button>
                        <button
                          className="rounded-full border border-gray-200 px-1 py-0 text-[9px] text-gray-400"
                          type="button"
                          onClick={() => hideThreadMutation.mutate(thread.id)}
                          disabled={hideThreadMutation.isPending}
                          aria-label={t('home.archive')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 pl-3 text-sm font-semibold">
                      {isEditing ? (
                        <span
                          className={
                            isThreadBodyMuted ? 'text-gray-400 line-through' : 'text-gray-900'
                          }
                        >
                          {highlightMatches(displayTitle, normalizedSearchQuery)}
                        </span>
                      ) : (
                        <Link
                          className={`hover:underline ${
                            isThreadBodyMuted
                              ? 'text-gray-400 line-through'
                              : 'text-gray-900'
                          }`}
                          to={`/threads/${thread.id}`}
                        >
                          {highlightMatches(displayTitle, normalizedSearchQuery)}
                        </Link>
                      )}
                    </div>
                    {isEditing ? (
                      <form
                        className="mt-2 space-y-2 sm:mt-3"
                        onSubmit={(event) => {
                          event.preventDefault()
                          if (!editingThreadBody.trim()) {
                            return
                          }
                          updateThreadMutation.mutate({
                            threadId: thread.id,
                            body: editingThreadBody,
                            categoryNames: editingThreadCategories,
                          })
                        }}
                      >
                        <textarea
                          className="min-h-[96px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={editingThreadBody}
                          onChange={(event) => setEditingThreadBody(event.target.value)}
                          onInput={handleTextareaInput}
                          data-autoresize="true"
                          ref={(element) => resizeTextarea(element)}
                        />
                        <div className="mt-4 py-2">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {categoriesQuery.data
                                ?.filter((category) => !editingThreadCategories.includes(category.name))
                                .map((category) => {
                                  const isSelected = editingThreadCategories.includes(category.name)
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
                                      setEditingThreadCategories((prev) =>
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
                              <div className="flex items-center">
                                {isAddingEditingCategory ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      className="w-44 rounded-full border border-gray-300 px-3 py-1 text-xs transition-all"
                                      placeholder={t('home.categoryPlaceholder')}
                                      value={editingCategoryInput}
                                      onChange={(event) =>
                                        setEditingCategoryInput(event.target.value)
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault()
                                          event.stopPropagation()
                                          submitCategory('edit')
                                        }
                                        if (event.key === 'Escape') {
                                          event.stopPropagation()
                                          setEditingCategoryInput('')
                                          setIsAddingEditingCategory(false)
                                        }
                                      }}
                                      ref={editingCategoryInputRef}
                                      disabled={createCategoryMutation.isPending}
                                    />
                                    <button
                                      className="flex h-7 items-center justify-center rounded-full border border-gray-300 px-2 text-[11px] font-semibold text-gray-700 transition-all"
                                      type="button"
                                      onClick={() => submitCategory('edit')}
                                      disabled={createCategoryMutation.isPending}
                                    >
                                      {t('home.addCategory')}
                                    </button>
                                    <button
                                      className="flex h-7 items-center justify-center rounded-full border border-gray-300 px-2 text-[11px] font-semibold text-gray-700 transition-all"
                                      type="button"
                                      onClick={() => {
                                        setEditingCategoryInput('')
                                        setIsAddingEditingCategory(false)
                                      }}
                                      disabled={createCategoryMutation.isPending}
                                    >
                                      {t('home.cancel')}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-700 transition-all"
                                    type="button"
                                    onClick={() => setIsAddingEditingCategory(true)}
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                            type="submit"
                            disabled={updateThreadMutation.isPending}
                          >
                            {t('home.save')}
                          </button>
                          <button
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                            type="button"
                            onClick={() => {
                              setEditingThreadId(null)
                              setEditingThreadBody('')
                              setEditingThreadCategoriesId(null)
                              setEditingThreadCategories([])
                              setEditingCategoryInput('')
                              setIsAddingEditingCategory(false)
                            }}
                          >
                            {t('home.cancel')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      thread.body &&
                      (() => {
                        const isBodyMuted = isThreadBodyMuted
                        const normalizedBody =
                          thread.body && isBodyMuted ? stripMutedText(thread.body) : thread.body
                        const body =
                          normalizedBody && displayTitle
                            ? getBodyWithoutTitle(displayTitle, normalizedBody)
                            : ''
                        return body ? (
                          <p
                            className={`mt-2 whitespace-pre-wrap text-sm ${
                              isBodyMuted ? 'text-gray-400 line-through' : 'text-gray-700'
                            }`}
                          >
                            {highlightMatches(body, normalizedSearchQuery)}
                          </p>
                        ) : null
                      })()
                    )}
                    <div className="mt-2 space-y-2 sm:mt-6">
                      {thread.entries.map((entry) => (
                        (() => {
                          const depth = entryDepth.get(entry.id) ?? 1
                          const indentClass =
                            depth === 2 ? 'ml-6' : depth >= 3 ? 'ml-12' : ''
                          return (
                        <div
                          key={entry.id}
                          className={`relative rounded-lg border px-1.5 py-1 shadow-sm sm:px-3 sm:py-2 ${theme.entry} ${indentClass}`}
                        >
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            <button
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                              type="button"
                              onClick={() => {
                                setEditingEntryId(entry.id)
                                setEditingEntryBody(entry.body)
                              }}
                              aria-label={t('home.edit')}
                            >
                              <img className="h-3.5 w-3.5" src={eraserIcon} alt="" />
                            </button>
                            <button
                              className={`rounded-full border px-1 py-0 text-[8px] ${
                                isMutedText(entry.body)
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-200 text-gray-400'
                              }`}
                              type="button"
                              onClick={() => {
                                if (!entry.body) {
                                  return
                                }
                                toggleEntryMuteMutation.mutate({
                                  entryId: entry.id,
                                  body: toggleMutedText(entry.body),
                                })
                              }}
                              aria-label="Toggle strikethrough"
                            >
                              -
                            </button>
                            <button
                              className="rounded-full border border-gray-200 px-1 py-0 text-[8px] text-gray-400"
                              type="button"
                              onClick={() => hideEntryMutation.mutate(entry.id)}
                              disabled={hideEntryMutation.isPending}
                              aria-label={t('home.archive')}
                            >
                              ×
                            </button>
                          </div>
                          {editingEntryId === entry.id ? (
                            <form
                              className="space-y-2"
                              onSubmit={(event) => {
                                event.preventDefault()
                                if (!editingEntryBody.trim()) {
                                  return
                                }
                                updateEntryMutation.mutate({
                                  entryId: entry.id,
                                  body: editingEntryBody,
                                })
                              }}
                            >
                              <textarea
                                className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
                                value={editingEntryBody}
                                onChange={(event) => setEditingEntryBody(event.target.value)}
                                onInput={handleTextareaInput}
                                data-autoresize="true"
                                ref={(element) => resizeTextarea(element)}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  className="rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                                  type="submit"
                                  disabled={updateEntryMutation.isPending}
                                >
                                  {t('home.save')}
                                </button>
                                <button
                                  className="rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-700"
                                  type="button"
                                  onClick={() => {
                                    setEditingEntryId(null)
                                    setEditingEntryBody('')
                                  }}
                                >
                                  {t('home.cancel')}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              {(() => {
                                const rawEntryBody = isMutedText(entry.body)
                                  ? stripMutedText(entry.body)
                                  : entry.body
                                return (
                              <div
                                className={`text-sm ${
                                  isMutedText(entry.body) ? 'text-gray-400 line-through' : 'text-gray-800'
                                }`}
                              >
                                {highlightMatches(rawEntryBody, normalizedSearchQuery)}
                              </div>
                                )
                              })()}
                              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                                <span>
                                  {formatDistanceToNow(new Date(entry.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                                <div className="flex items-center gap-2">
                                  {depth < 3 && (
                                    <button
                                      className="rounded-md border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
                                      type="button"
                                      onClick={() => {
                                        setActiveReplyId(entry.id)
                                        setReplyDrafts((prev) => ({
                                          ...prev,
                                          [entry.id]: prev[entry.id] ?? '',
                                        }))
                                      }}
                                    >
                                      {t('home.reply')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          {activeReplyId === entry.id && depth < 3 && (
                            <form
                              className="mt-1 space-y-2 sm:mt-2"
                              onSubmit={(event) => {
                                event.preventDefault()
                                const body = replyDrafts[entry.id]?.trim()
                                if (!body) {
                                  return
                                }
                                addEntryMutation.mutate({
                                  threadId: thread.id,
                                  body,
                                  parentEntryId: entry.id,
                                })
                              }}
                            >
                              <textarea
                                className="min-h-[64px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
                                placeholder={t('home.replyPlaceholder')}
                                value={replyDrafts[entry.id] ?? ''}
                                onChange={(event) =>
                                  setReplyDrafts((prev) => ({
                                    ...prev,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                onInput={handleTextareaInput}
                                data-autoresize="true"
                                ref={(element) => resizeTextarea(element)}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  className="rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                                  type="submit"
                                  disabled={addEntryMutation.isPending}
                                >
                                  {t('home.reply')}
                                </button>
                                <button
                                  className="rounded-md border border-gray-300 px-2 py-1 text-[10px] text-gray-700"
                                  type="button"
                                  onClick={() => setActiveReplyId(null)}
                                >
                                  {t('home.cancel')}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                          )
                        })()
                      ))}
                    </div>
                    <form
                      className="mt-2 space-y-2 sm:mt-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const body = entryDrafts[thread.id]?.trim()
                        if (!body) {
                          return
                        }
                        addEntryMutation.mutate({ threadId: thread.id, body })
                      }}
                    >
                      <textarea
                        className="min-h-[72px] w-full resize-none overflow-y-hidden rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder={t('home.entryPlaceholder')}
                        value={entryDrafts[thread.id] ?? ''}
                        onChange={(event) =>
                          setEntryDrafts((prev) => ({
                            ...prev,
                            [thread.id]: event.target.value,
                          }))
                        }
                        onInput={handleTextareaInput}
                        data-autoresize="true"
                        ref={(element) => resizeTextarea(element)}
                      />
                      <button
                        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                        type="submit"
                        disabled={addEntryMutation.isPending}
                      >
                        {addEntryMutation.isPending ? t('home.loading') : t('home.addEntry')}
                      </button>
                    </form>
                    <div className="mt-2 text-xs text-gray-500 sm:mt-4">
                      {t('home.lastActivity', {
                        time: formatDistanceToNow(new Date(thread.lastActivityAt), {
                          addSuffix: true,
                        }),
                      })}
                    </div>
                  </div>
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
      )}
    </div>
  )
}
