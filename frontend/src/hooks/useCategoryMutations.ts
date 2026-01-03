import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { CategorySummary } from '../lib/api'
import { createCategory, deleteCategory, updateCategory } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type CreateVariables = { name: string } & Record<string, unknown>
type UpdateVariables = { id: string; name: string } & Record<string, unknown>
type DeleteVariables = { id: string } & Record<string, unknown>

type CategoryMutationOptions = {
  invalidateThreadsFeed?: boolean
  invalidateThreadsSearch?: boolean
  invalidateHiddenThreads?: boolean
  extraInvalidateKeys?: Array<readonly unknown[]>
  onCreateSuccess?: (created: CategorySummary, variables: CreateVariables) => void
  onUpdateSuccess?: (updated: CategorySummary, variables: UpdateVariables) => void
  onDeleteSuccess?: (variables: DeleteVariables) => void
}

const invalidateKeys = async (
  queryClient: QueryClient,
  keys: Array<readonly unknown[]>,
) => {
  for (const key of keys) {
    await queryClient.invalidateQueries({ queryKey: key })
  }
}

export const useCategoryMutations = (options: CategoryMutationOptions = {}) => {
  const queryClient = useQueryClient()

  const baseKeys: Array<readonly unknown[]> = [queryKeys.categories]
  if (options.invalidateThreadsFeed) {
    baseKeys.push(queryKeys.threads.feed)
  }
  if (options.invalidateThreadsSearch) {
    baseKeys.push(queryKeys.threads.searchRoot)
  }
  if (options.invalidateHiddenThreads) {
    baseKeys.push(queryKeys.threads.hidden)
    baseKeys.push(queryKeys.threads.hiddenSearchRoot)
  }
  if (options.extraInvalidateKeys?.length) {
    baseKeys.push(...options.extraInvalidateKeys)
  }

  const createCategoryMutation = useMutation({
    mutationFn: ({ name }: CreateVariables) => createCategory(name),
    onSuccess: async (created, variables) => {
      await invalidateKeys(queryClient, baseKeys)
      options.onCreateSuccess?.(created, variables)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: UpdateVariables) => updateCategory(id, name),
    onSuccess: async (updated, variables) => {
      await invalidateKeys(queryClient, baseKeys)
      options.onUpdateSuccess?.(updated, variables)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id }: DeleteVariables) => deleteCategory(id),
    onSuccess: async (_result, variables) => {
      await invalidateKeys(queryClient, baseKeys)
      options.onDeleteSuccess?.(variables)
    },
  })

  return {
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
  }
}
