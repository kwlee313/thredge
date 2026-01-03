import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ThreadSummary } from '../lib/api'
import {
  hideEntry,
  hideThread,
  pinThread,
  unpinThread,
  updateEntry,
  updateThread,
} from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

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
  onEntryUpdated?: (entryId: string, body: string) => void
  onEntryHidden?: (entryId: string) => void
}

const defaultInvalidateTargets: InvalidateTarget[] = ['feed', 'thread']

export const useThreadActions = (options: ThreadActionsOptions = {}) => {
  const queryClient = useQueryClient()
  const invalidateTargets = options.invalidateTargets ?? defaultInvalidateTargets
  const shouldInvalidate = (target: InvalidateTarget) => invalidateTargets.includes(target)

  const invalidateThreadKeys = async (threadId?: string | null) => {
    const id = threadId ?? options.threadId
    if (shouldInvalidate('thread') && id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.thread.detail(id) })
    }
    if (shouldInvalidate('feed')) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
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
    mutationFn: ({ entryId, body }: { entryId: string; body: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (_, variables) => {
      options.onEntryUpdated?.(variables.entryId, variables.body)
      await invalidateThreadKeys(options.threadId)
    },
  })

  const toggleEntryMuteMutation = useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: string }) =>
      updateEntry(entryId, body),
    onSuccess: async (_, variables) => {
      options.onEntryUpdated?.(variables.entryId, variables.body)
      await invalidateThreadKeys(options.threadId)
    },
  })

  const hideEntryMutation = useMutation({
    mutationFn: (entryId: string) => hideEntry(entryId),
    onSuccess: async (_, entryId) => {
      options.onEntryHidden?.(entryId)
      await invalidateThreadKeys(options.threadId)
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
