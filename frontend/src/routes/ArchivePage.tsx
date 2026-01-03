import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  fetchHiddenEntries,
  fetchHiddenThreads,
  restoreEntry,
  restoreThread,
  searchHiddenEntries,
  searchHiddenThreads,
} from '../lib/api'
import { useDebouncedValue } from '../lib/useDebouncedValue'

export function ArchivePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [threadFilter, setThreadFilter] = useState('')
  const [entryFilter, setEntryFilter] = useState('')
  const [toast, setToast] = useState<string | null>(null)

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

  const debouncedThreadFilter = useDebouncedValue(threadFilter.trim(), 250)
  const debouncedEntryFilter = useDebouncedValue(entryFilter.trim(), 250)

  const hiddenThreadsQuery = useQuery({
    queryKey: ['threads', 'hidden'],
    queryFn: fetchHiddenThreads,
    enabled: debouncedThreadFilter.length === 0,
  })

  const hiddenThreadSearchQuery = useQuery({
    queryKey: ['threads', 'hidden', 'search', debouncedThreadFilter],
    queryFn: () => searchHiddenThreads(debouncedThreadFilter),
    enabled: debouncedThreadFilter.length > 0,
  })

  const hiddenEntriesQuery = useQuery({
    queryKey: ['entries', 'hidden'],
    queryFn: fetchHiddenEntries,
    enabled: debouncedEntryFilter.length === 0,
  })

  const hiddenEntrySearchQuery = useQuery({
    queryKey: ['entries', 'hidden', 'search', debouncedEntryFilter],
    queryFn: () => searchHiddenEntries(debouncedEntryFilter),
    enabled: debouncedEntryFilter.length > 0,
  })

  const restoreThreadMutation = useMutation({
    mutationFn: (id: string) => restoreThread(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden', 'search'] })
      setToast(t('archive.restoredThread'))
    },
  })

  const restoreEntryMutation = useMutation({
    mutationFn: (id: string) => restoreEntry(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries', 'hidden'] })
      await queryClient.invalidateQueries({ queryKey: ['entries', 'hidden', 'search'] })
      setToast(t('archive.restoredEntry'))
    },
  })

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredThreads = useMemo(() => {
    return debouncedThreadFilter.length > 0
      ? hiddenThreadSearchQuery.data ?? []
      : hiddenThreadsQuery.data ?? []
  }, [debouncedThreadFilter.length, hiddenThreadSearchQuery.data, hiddenThreadsQuery.data])

  const filteredEntries = useMemo(() => {
    return debouncedEntryFilter.length > 0
      ? hiddenEntrySearchQuery.data ?? []
      : hiddenEntriesQuery.data ?? []
  }, [debouncedEntryFilter.length, hiddenEntriesQuery.data, hiddenEntrySearchQuery.data])

  return (
    <div className="space-y-2 sm:space-y-4">
      <h1 className="text-xl font-semibold">{t('archive.title')}</h1>

      {toast && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {toast}
        </div>
      )}

      <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
        <div className="text-sm font-semibold">{t('archive.hiddenThreads')}</div>
        <input
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:mt-2"
          placeholder={t('archive.filterThreads')}
          value={threadFilter}
          onChange={(event) => setThreadFilter(event.target.value)}
        />
        {debouncedThreadFilter.length > 0 && hiddenThreadSearchQuery.isFetching && (
          <div className="mt-1 text-xs text-gray-500">{t('archive.searching')}</div>
        )}
        <div className="mt-2 space-y-2 sm:mt-3">
          {(debouncedThreadFilter.length > 0 ? hiddenThreadSearchQuery : hiddenThreadsQuery)
            .isLoading && (
            <div className="text-sm text-gray-600">{t('archive.loading')}</div>
          )}
          {(debouncedThreadFilter.length > 0 ? hiddenThreadSearchQuery : hiddenThreadsQuery)
            .isError && (
            <div className="text-sm text-red-600">{t('archive.error')}</div>
          )}
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-md border border-gray-200 px-1.5 py-1 sm:px-3 sm:py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  className="text-sm font-semibold text-gray-900 hover:underline"
                  to={`/threads/${thread.id}`}
                >
                  {highlightMatches(thread.title, debouncedThreadFilter)}
                </Link>
                <button
                  className="text-xs text-gray-700 underline"
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t('archive.restoreConfirmThread'))) {
                      return
                    }
                    restoreThreadMutation.mutate(thread.id)
                  }}
                  disabled={restoreThreadMutation.isPending}
                >
                  {t('archive.restore')}
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {t('archive.lastActivity', {
                  time: formatDistanceToNow(new Date(thread.lastActivityAt), {
                    addSuffix: true,
                  }),
                })}
              </div>
            </div>
          ))}
          {!(debouncedThreadFilter.length > 0 ? hiddenThreadSearchQuery : hiddenThreadsQuery)
            .isLoading &&
            filteredThreads.length === 0 && (
            <div className="text-sm text-gray-600">{t('archive.emptyThreads')}</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
        <div className="text-sm font-semibold">{t('archive.hiddenEntries')}</div>
        <input
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:mt-2"
          placeholder={t('archive.filterEntries')}
          value={entryFilter}
          onChange={(event) => setEntryFilter(event.target.value)}
        />
        {debouncedEntryFilter.length > 0 && hiddenEntrySearchQuery.isFetching && (
          <div className="mt-1 text-xs text-gray-500">{t('archive.searching')}</div>
        )}
        <div className="mt-2 space-y-2 sm:mt-3">
          {(debouncedEntryFilter.length > 0 ? hiddenEntrySearchQuery : hiddenEntriesQuery)
            .isLoading && (
            <div className="text-sm text-gray-600">{t('archive.loading')}</div>
          )}
          {(debouncedEntryFilter.length > 0 ? hiddenEntrySearchQuery : hiddenEntriesQuery)
            .isError && (
            <div className="text-sm text-red-600">{t('archive.error')}</div>
          )}
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md border border-gray-200 px-1.5 py-1 sm:px-3 sm:py-2"
            >
              <div className="text-sm text-gray-900">
                {highlightMatches(entry.body, debouncedEntryFilter)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-2">
                  {entry.threadId && (
                    <Link className="text-xs text-gray-700 underline" to={`/threads/${entry.threadId}`}>
                      {t('archive.openThread')}
                    </Link>
                  )}
                  <button
                    className="text-xs text-gray-700 underline"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(t('archive.restoreConfirmEntry'))) {
                        return
                      }
                      restoreEntryMutation.mutate(entry.id)
                    }}
                    disabled={restoreEntryMutation.isPending}
                  >
                    {t('archive.restore')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!(debouncedEntryFilter.length > 0 ? hiddenEntrySearchQuery : hiddenEntriesQuery)
            .isLoading &&
            filteredEntries.length === 0 && (
            <div className="text-sm text-gray-600">{t('archive.emptyEntries')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
