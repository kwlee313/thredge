import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EntryDetail } from '../lib/api'
import { addEntry } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type InvalidateTarget = 'feed' | 'search' | 'thread'

type CreateEntryVariables = {
  threadId: string
  body: string
  parentEntryId?: string
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
    mutationFn: ({ threadId, body, parentEntryId }: CreateEntryVariables) =>
      addEntry(threadId, body, parentEntryId),
    onSuccess: async (created, variables) => {
      options.onEntryCreated?.(created, variables)
      await invalidateEntryKeys(variables.threadId)
    },
  })

  return {
    createEntryMutation,
  }
}
