import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EntryDetail, ThreadSummary } from '../lib/api'
import {
  hideEntry,
  hideThread,
  pinThread,
  unpinThread,
  updateEntry,
  updateThread,
} from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { removeThreadFromFeed } from '../lib/threadCache'

export type InvalidateTarget =
  | 'feed'
  | 'search'
  | 'thread'
  | 'hiddenThreads'
  | 'hiddenEntries'

type ThreadActionsOptions = {
  threadId?: string
  invalidateTargets?: InvalidateTarget[]
  onThreadUpdated?: (threadId: string) => void
  onThreadHidden?: (threadId: string) => void
  onThreadPinned?: (updated: ThreadSummary) => void
  onThreadUnpinned?: (updated: ThreadSummary) => void
  onEntryUpdated?: (entryId: string, body: string, threadId?: string | null) => void
  onEntryHidden?: (entryId: string) => void
}

const defaultInvalidateTargets: InvalidateTarget[] = ['feed', 'thread']

export const useThreadActions = (options: ThreadActionsOptions = {}) => {
  const queryClient = useQueryClient()
  const invalidateTargets = options.invalidateTargets ?? defaultInvalidateTargets
  const shouldInvalidate = (target: InvalidateTarget) => invalidateTargets.includes(target)

  const invalidateThreadKeys = async (threadId?: string | null) => {
    const id = threadId ?? options.threadId
    if (id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.entries(id) })
    }
    if (shouldInvalidate('thread') && id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.thread.detail(id) })
    }
    if (shouldInvalidate('feed')) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoriesCounts })
    }
    if (shouldInvalidate('search')) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.searchRoot })
    }
    if (shouldInvalidate('hiddenThreads')) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.hidden })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.hiddenSearchRoot })
    }
    if (shouldInvalidate('hiddenEntries')) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.entries.hidden })
      await queryClient.invalidateQueries({ queryKey: queryKeys.entries.hiddenSearchRoot })
    }
  }

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
    onSuccess: async (_, variables) => {
      options.onThreadUpdated?.(variables.threadId)
      await invalidateThreadKeys(variables.threadId)
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
    onSuccess: async (_, variables) => {
      options.onThreadUpdated?.(variables.threadId)
      await invalidateThreadKeys(variables.threadId)
    },
  })

  const hideThreadMutation = useMutation({
    mutationFn: (threadId: string) => hideThread(threadId),
    onSuccess: async (_, threadId) => {
      removeThreadFromFeed(queryClient, threadId)
      options.onThreadHidden?.(threadId)
      await invalidateThreadKeys(threadId)
    },
  })

  const pinThreadMutation = useMutation({
    mutationFn: (threadId: string) => pinThread(threadId),
    onSuccess: async (updated) => {
      options.onThreadPinned?.(updated)
      await invalidateThreadKeys(updated.id)
    },
  })

  const unpinThreadMutation = useMutation({
    mutationFn: (threadId: string) => unpinThread(threadId),
    onSuccess: async (updated) => {
      options.onThreadUnpinned?.(updated)
      await invalidateThreadKeys(updated.id)
    },
  })

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string; threadId?: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (updated, variables) => {
      options.onEntryUpdated?.(updated.id, updated.body, updated.threadId)
      await invalidateThreadKeys(variables.threadId)
    },
  })

  const toggleEntryMuteMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string; threadId?: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (updated, variables) => {
      options.onEntryUpdated?.(updated.id, updated.body, updated.threadId)
      await invalidateThreadKeys(variables.threadId)
    },
  })

  const hideEntryMutation = useMutation({
    mutationFn: ({ entryId }: { entryId: string; threadId?: string }) => hideEntry(entryId),
    onSuccess: async (_, variables) => {
      const threadId = variables.threadId ?? options.threadId
      if (threadId) {
        queryClient.setQueryData<EntryDetail[]>(queryKeys.threads.entries(threadId), (old) =>
          old ? old.filter((e) => e.id !== variables.entryId) : [],
        )
      }
      options.onEntryHidden?.(variables.entryId)
      await invalidateThreadKeys(threadId)
    },
  })

  return {
    updateThreadMutation,
    toggleThreadMuteMutation,
    hideThreadMutation,
    pinThreadMutation,
    unpinThreadMutation,
    updateEntryMutation,
    toggleEntryMuteMutation,
    hideEntryMutation,
  }
}
