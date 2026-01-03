import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addEntry,
  createCategory,
  fetchCategories,
  fetchThread,
  hideEntry,
  hideThread,
  pinThread,
  unpinThread,
  updateEntry,
  updateThread,
} from '../lib/api'
import pinIcon from '../assets/pin.svg'
import pinFilledIcon from '../assets/pin-filled.svg'
import eraserIcon from '../assets/eraser.svg'

export function ThreadDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [entryBody, setEntryBody] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEntryBody, setEditingEntryBody] = useState('')
  const [isEditingThread, setIsEditingThread] = useState(false)
  const [editingThreadBody, setEditingThreadBody] = useState('')
  const [editingThreadCategories, setEditingThreadCategories] = useState<string[]>([])
  const [editingCategoryInput, setEditingCategoryInput] = useState('')
  const [isAddingEditingCategory, setIsAddingEditingCategory] = useState(false)
  const editingCategoryInputRef = useRef<HTMLInputElement | null>(null)

  const MAX_TEXTAREA_HEIGHT = 240

  const isMutedText = (text?: string | null) =>
    Boolean(text && text.startsWith('~~') && text.endsWith('~~') && text.length > 4)
  const stripMutedText = (text: string) => text.slice(2, -2)
  const toggleMutedText = (text: string) => (isMutedText(text) ? stripMutedText(text) : `~~${text}~~`)

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
  }, [editingThreadBody, editingEntryBody, replyDrafts, entryBody])

  const threadQuery = useQuery({
    queryKey: ['thread', id],
    queryFn: () => fetchThread(id ?? ''),
    enabled: Boolean(id),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: threadQuery.isSuccess,
  })

  const createCategoryMutation = useMutation({
    mutationFn: ({ name }: { name: string }) => createCategory(name),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
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

  const entryMutation = useMutation({
    mutationFn: ({
      body,
      parentEntryId,
    }: {
      body: string
      parentEntryId?: string
    }) => addEntry(id ?? '', body, parentEntryId),
    onSuccess: async (_, variables) => {
      if (variables.parentEntryId) {
        setReplyDrafts((prev) => ({ ...prev, [variables.parentEntryId as string]: '' }))
        setActiveReplyId(null)
      } else {
        setEntryBody('')
      }
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  const updateThreadMutation = useMutation({
    mutationFn: ({
      body,
      categoryNames,
    }: {
      body: string
      categoryNames: string[]
    }) => updateThread(id ?? '', body, categoryNames),
    onSuccess: async () => {
      setIsEditingThread(false)
      setEditingCategoryInput('')
      setIsAddingEditingCategory(false)
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  const toggleThreadMuteMutation = useMutation({
    mutationFn: ({
      body,
      categoryNames,
    }: {
      body: string
      categoryNames: string[]
    }) => updateThread(id ?? '', body, categoryNames),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  const hideThreadMutation = useMutation({
    mutationFn: () => hideThread(id ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      navigate('/')
    },
  })

  const pinThreadMutation = useMutation({
    mutationFn: (threadId: string) => pinThread(threadId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  const unpinThreadMutation = useMutation({
    mutationFn: (threadId: string) => unpinThread(threadId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  const updateEntryMutation = useMutation({
    mutationFn: () => updateEntry(editingEntryId ?? '', editingEntryBody),
    onSuccess: async () => {
      setEditingEntryId(null)
      setEditingEntryBody('')
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
    },
  })

  const toggleEntryMuteMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string }) => updateEntry(entryId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
    },
  })

  const hideEntryMutation = useMutation({
    mutationFn: (entryId: string) => hideEntry(entryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    },
  })

  useEffect(() => {
    if (threadQuery.data) {
      setEditingThreadBody(threadQuery.data.body ?? '')
      setEditingThreadCategories(threadQuery.data.categories.map((item) => item.name))
    }
  }, [threadQuery.data])

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
            <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    threadQuery.data.pinned
                      ? 'border-gray-900 text-gray-900'
                      : 'border-gray-200 text-gray-400'
                  }`}
                  type="button"
                  onClick={() => {
                    if (threadQuery.data.pinned) {
                      unpinThreadMutation.mutate(threadQuery.data.id)
                    } else {
                      pinThreadMutation.mutate(threadQuery.data.id)
                    }
                  }}
                  disabled={pinThreadMutation.isPending || unpinThreadMutation.isPending}
                  aria-label={threadQuery.data.pinned ? t('home.unpin') : t('home.pin')}
                >
                  <img
                    className="h-3.5 w-3.5"
                    src={threadQuery.data.pinned ? pinFilledIcon : pinIcon}
                    alt=""
                  />
                </button>
                {isEditingThread
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
                  : threadQuery.data.categories.map((category) => (
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
                    setIsEditingThread(true)
                    setEditingThreadBody(threadQuery.data.body ?? '')
                    setEditingThreadCategories(threadQuery.data.categories.map((item) => item.name))
                    setEditingCategoryInput('')
                    setIsAddingEditingCategory(false)
                    requestAnimationFrame(() => editingCategoryInputRef.current?.focus())
                  }}
                  aria-label={t('home.edit')}
                >
                  <img className="h-3.5 w-3.5" src={eraserIcon} alt="" />
                </button>
                <button
                  className={`rounded-full border px-1 py-0 text-[9px] ${
                    isMutedText(threadQuery.data.body)
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-400'
                  }`}
                  type="button"
                  onClick={() => {
                    if (!threadQuery.data.body) {
                      return
                    }
                    toggleThreadMuteMutation.mutate({
                      body: toggleMutedText(threadQuery.data.body),
                      categoryNames: threadQuery.data.categories.map((item) => item.name),
                    })
                  }}
                  aria-label="Toggle strikethrough"
                >
                  -
                </button>
                <button
                  className="rounded-full border border-gray-200 px-1 py-0 text-[9px] text-gray-400"
                  type="button"
                  onClick={() => hideThreadMutation.mutate()}
                  disabled={hideThreadMutation.isPending}
                  aria-label={t('home.archive')}
                >
                  ×
                </button>
              </div>
            </div>
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
              <form
                className="mt-2 space-y-2 sm:mt-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!editingThreadBody.trim()) {
                    return
                  }
                  updateThreadMutation.mutate({
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
                              onChange={(event) => setEditingCategoryInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  submitCategory()
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
                              onClick={() => submitCategory()}
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
                    className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                    type="submit"
                    disabled={updateThreadMutation.isPending}
                  >
                    {updateThreadMutation.isPending ? t('home.loading') : t('home.save')}
                  </button>
                  <button
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
                    type="button"
                    onClick={() => {
                      setIsEditingThread(false)
                      setEditingThreadBody(threadQuery.data.body ?? '')
                      setEditingThreadCategories(threadQuery.data.categories.map((item) => item.name))
                      setEditingCategoryInput('')
                      setIsAddingEditingCategory(false)
                    }}
                  >
                    {t('home.cancel')}
                  </button>
                </div>
              </form>
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
              {threadQuery.data.entries.map((entry) => {
                const depth = entryDepth.get(entry.id) ?? 1
                const indentClass = depth === 2 ? 'ml-6' : depth >= 3 ? 'ml-12' : ''
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
                          updateEntryMutation.mutate()
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
                        <div
                          className={`text-sm ${
                            isMutedText(entry.body)
                              ? 'text-gray-400 line-through'
                              : 'text-gray-800'
                          }`}
                        >
                          {isMutedText(entry.body) ? stripMutedText(entry.body) : entry.body}
                        </div>
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
                          entryMutation.mutate({ body, parentEntryId: entry.id })
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
                            disabled={entryMutation.isPending}
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
              })}
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
                entryMutation.mutate({ body: entryBody })
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
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                type="submit"
                disabled={entryMutation.isPending}
              >
                {entryMutation.isPending ? t('home.loading') : t('home.addEntry')}
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
