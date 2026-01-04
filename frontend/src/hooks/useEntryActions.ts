import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EntryDetail, EntryMoveDirection } from '../lib/api'
import { addEntry, moveEntry } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { updateEntryPositionInFeed, updateEntryPositionInThreadDetail } from '../lib/threadCache'

type InvalidateTarget = 'feed' | 'search' | 'thread'

type CreateEntryInput = {
  threadId?: string
  body: string
  parentEntryId?: string
}

type CreateEntryVariables = {
  threadId: string
  body: string
  parentEntryId?: string
}

type MoveEntryVariables = {
  entryId: string
  direction: EntryMoveDirection
  threadId?: string
}

type EntryActionsOptions = {
  threadId?: string
  invalidateTargets?: InvalidateTarget[]
  onEntryCreated?: (entry: EntryDetail, variables: CreateEntryVariables) => void
}

const defaultInvalidateTargets: InvalidateTarget[] = ['feed', 'search']

export const useEntryActions = (options: EntryActionsOptions = {}) => {
  const queryClient = useQueryClient()
  const invalidateTargets = options.invalidateTargets ?? defaultInvalidateTargets
  const shouldInvalidate = (target: InvalidateTarget) => invalidateTargets.includes(target)

  const invalidateEntryKeys = async (threadId?: string | null) => {
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
  }

  const createEntryMutation = useMutation({
    mutationFn: ({ threadId, body, parentEntryId }: CreateEntryInput) => {
      const resolvedThreadId = threadId ?? options.threadId
      if (!resolvedThreadId) {
        throw new Error('Entry create failed: missing thread id')
      }
      return addEntry(resolvedThreadId, body, parentEntryId)
    },
    onSuccess: async (created, variables) => {
      const resolvedThreadId = variables.threadId ?? options.threadId
      if (!resolvedThreadId) {
        return
      }
      const normalizedVariables: CreateEntryVariables = {
        threadId: resolvedThreadId,
        body: variables.body,
        parentEntryId: variables.parentEntryId,
      }
      options.onEntryCreated?.(created, normalizedVariables)
      await invalidateEntryKeys(resolvedThreadId)
    },
  })

  const moveEntryMutation = useMutation({
    mutationFn: ({ entryId, direction }: MoveEntryVariables) => moveEntry(entryId, direction),
    onSuccess: async (moved, variables) => {
      const resolvedThreadId = variables.threadId ?? options.threadId ?? moved.threadId ?? undefined
      updateEntryPositionInFeed(queryClient, moved)
      if (resolvedThreadId) {
        updateEntryPositionInThreadDetail(queryClient, resolvedThreadId, moved)
      }
      await invalidateEntryKeys(resolvedThreadId)
    },
  })

  return {
    createEntryMutation,
    moveEntryMutation,
  }
}
