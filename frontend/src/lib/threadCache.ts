import type { QueryClient } from '@tanstack/react-query'
import type { ThreadDetail, ThreadSummary } from './api'
import { queryKeys } from './queryKeys'

const sortFeedThreads = (threads: ThreadDetail[]) =>
  threads.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1
    }
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  })

export const removeThreadFromFeed = (queryClient: QueryClient, threadId: string) => {
  queryClient.setQueryData(queryKeys.threads.feed, (data) => {
    if (!Array.isArray(data)) {
      return data
    }
    return data.filter((thread) => thread.id !== threadId)
  })
}

export const setThreadPinnedInFeed = (
  queryClient: QueryClient,
  updated: ThreadSummary,
  pinned: boolean,
) => {
  queryClient.setQueryData(queryKeys.threads.feed, (data) => {
    if (!Array.isArray(data)) {
      return data
    }
    const next = data.map((thread) =>
      thread.id === updated.id ? { ...thread, pinned } : thread,
    )
    return sortFeedThreads(next as ThreadDetail[])
  })
}

export const updateEntryInFeed = (
  queryClient: QueryClient,
  entryId: string,
  body: string,
) => {
  queryClient.setQueryData(queryKeys.threads.feed, (data) => {
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
}

export const removeEntryFromFeed = (queryClient: QueryClient, entryId: string) => {
  queryClient.setQueryData(queryKeys.threads.feed, (data) => {
    if (!Array.isArray(data)) {
      return data
    }
    return data.map((thread) => ({
      ...thread,
      entries: thread.entries.filter((entry) => entry.id !== entryId),
    }))
  })
}
