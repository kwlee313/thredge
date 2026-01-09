import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { EntryDetail, PageResponse, ThreadDetail, ThreadSummary } from './api'
import { queryKeys } from './queryKeys'

type ThreadFeedData = InfiniteData<PageResponse<ThreadDetail>>

const updateFeedPages = (
  data: ThreadFeedData | unknown,
  updater: (items: ThreadDetail[]) => ThreadDetail[],
) => {
  if (!data || typeof data !== 'object') {
    return data
  }
  const candidate = data as ThreadFeedData
  if (!Array.isArray(candidate.pages)) {
    return data
  }
  return {
    ...candidate,
    pages: candidate.pages.map((page) => ({
      ...page,
      items: updater(page.items),
    })),
  }
}

export const removeThreadFromFeed = (queryClient: QueryClient, threadId: string) => {
  const updater = (data: any) =>
    updateFeedPages(data, (items) => items.filter((thread) => thread.id !== threadId))
  queryClient.setQueriesData({ queryKey: queryKeys.threads.feed }, updater)
  queryClient.setQueriesData({ queryKey: queryKeys.threads.searchRoot }, updater)
}

export const setThreadPinnedInFeed = (
  queryClient: QueryClient,
  updated: ThreadSummary,
  pinned: boolean,
) => {
  queryClient.setQueryData(queryKeys.threads.feed, (data) => {
    return updateFeedPages(data, (items) =>
      items.map((thread) => (thread.id === updated.id ? { ...thread, pinned } : thread)),
    )
  })
}

export const updateEntryInFeed = (
  queryClient: QueryClient,
  entryId: string,
  body: string,
) => {
  const updater = (data: any) => {
    return updateFeedPages(data, (items) =>
      items.map((thread) => ({
        ...thread,
        entries: thread.entries?.map((entry) =>
          entry.id === entryId ? { ...entry, body } : entry,
        ) ?? [],
      })),
    )
  }
  queryClient.setQueriesData({ queryKey: queryKeys.threads.feed }, updater)
  queryClient.setQueriesData({ queryKey: queryKeys.threads.searchRoot }, updater)
}

export const updateEntryPositionInFeed = (
  queryClient: QueryClient,
  entry: EntryDetail,
) => {
  const updater = (data: any) => {
    return updateFeedPages(data, (items) =>
      items.map((thread) => ({
        ...thread,
        entries: thread.entries.map((item) =>
          item.id === entry.id
            ? {
              ...item,
              parentEntryId: entry.parentEntryId,
              orderIndex: entry.orderIndex,
              createdAt: entry.createdAt,
            }
            : item,
        ),
      })),
    )
  }
  queryClient.setQueriesData({ queryKey: queryKeys.threads.feed }, updater)
  queryClient.setQueriesData({ queryKey: queryKeys.threads.searchRoot }, updater)
}

export const removeEntryFromFeed = (queryClient: QueryClient, entryId: string) => {
  const updater = (data: any) => {
    return updateFeedPages(data, (items) =>
      items.map((thread) => ({
        ...thread,
        entries: thread.entries.filter((entry) => entry.id !== entryId),
      })),
    )
  }
  queryClient.setQueriesData({ queryKey: queryKeys.threads.feed }, updater)
  queryClient.setQueriesData({ queryKey: queryKeys.threads.searchRoot }, updater)
}

export const updateEntryInThreadDetail = (
  queryClient: QueryClient,
  threadId: string,
  entryId: string,
  body: string,
) => {
  console.log('updateEntryInThreadDetail called', { threadId, entryId, body })
  queryClient.setQueryData(queryKeys.thread.detail(threadId), (data: ThreadDetail | undefined) => {
    console.log('Current cache data for thread', threadId, data)
    if (!data || typeof data !== 'object') {
      return data
    }
    const thread = data as ThreadDetail
    const newEntries = thread.entries.map((entry) =>
      entry.id === entryId ? { ...entry, body } : entry,
    )
    console.log('New entries', newEntries)
    return {
      ...thread,
      entries: newEntries,
    }
  })
}

export const updateEntryPositionInThreadDetail = (
  queryClient: QueryClient,
  threadId: string,
  entry: EntryDetail,
) => {
  queryClient.setQueryData(queryKeys.thread.detail(threadId), (data) => {
    if (!data || typeof data !== 'object') {
      return data
    }
    const thread = data as ThreadDetail
    return {
      ...thread,
      entries: thread.entries.map((item) =>
        item.id === entry.id
          ? {
            ...item,
            parentEntryId: entry.parentEntryId,
            orderIndex: entry.orderIndex,
            createdAt: entry.createdAt,
          }
          : item,
      ),
    }
  })
}

export const removeEntryFromThreadDetail = (
  queryClient: QueryClient,
  threadId: string,
  entryId: string,
) => {
  queryClient.setQueryData(queryKeys.thread.detail(threadId), (data) => {
    if (!data || typeof data !== 'object') {
      return data
    }
    const thread = data as ThreadDetail
    return {
      ...thread,
      entries: thread.entries.filter((entry) => entry.id !== entryId),
    }
  })
}

export const updateEntryInEntryList = (
  queryClient: QueryClient,
  threadId: string,
  entryId: string,
  body: string,
) => {
  queryClient.setQueryData<EntryDetail[]>(queryKeys.threads.entries(threadId), (old) => {
    if (!old) return old
    return old.map((entry) => (entry.id === entryId ? { ...entry, body } : entry))
  })
}
