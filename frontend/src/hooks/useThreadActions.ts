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

type InvalidateOptions = {
  feed?: boolean
  search?: boolean
  thread?: boolean
  hiddenThreads?: boolean
  hiddenEntries?: boolean
}

type ThreadActionsOptions = {
  threadId?: string
  invalidate?: InvalidateOptions
  onThreadUpdated?: (threadId: string) => void
  onThreadHidden?: (threadId: string) => void
  onThreadPinned?: (updated: ThreadSummary) => void
  onThreadUnpinned?: (updated: ThreadSummary) => void
  onEntryUpdated?: (entryId: string, body: string) => void
  onEntryHidden?: (entryId: string) => void
}

const defaultInvalidate: InvalidateOptions = {
  feed: true,
  thread: true,
}

export const useThreadActions = (options: ThreadActionsOptions = {}) => {
  const queryClient = useQueryClient()
  const invalidate = { ...defaultInvalidate, ...options.invalidate }

  const invalidateThreadKeys = async (threadId?: string | null) => {
    const id = threadId ?? options.threadId
    if (invalidate.thread && id) {
      await queryClient.invalidateQueries({ queryKey: ['thread', id] })
    }
    if (invalidate.feed) {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
    }
    if (invalidate.search) {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    }
    if (invalidate.hiddenThreads) {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'hidden'] })
    }
    if (invalidate.hiddenEntries) {
      await queryClient.invalidateQueries({ queryKey: ['entries', 'hidden'] })
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
