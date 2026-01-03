import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useDebouncedValue } from '../lib/useDebouncedValue'

type ArchivedSearchOptions<T> = {
  queryKey: readonly unknown[]
  searchKey: (query: string) => readonly unknown[]
  fetchAll: () => Promise<T[]>
  search: (query: string) => Promise<T[]>
  debounceMs?: number
}

export const useArchivedSearch = <T>({
  queryKey,
  searchKey,
  fetchAll,
  search,
  debounceMs = 250,
}: ArchivedSearchOptions<T>) => {
  const [filter, setFilter] = useState('')
  const debouncedFilter = useDebouncedValue(filter.trim(), debounceMs)

  const baseQuery = useQuery({
    queryKey,
    queryFn: fetchAll,
    enabled: debouncedFilter.length === 0,
  })

  const searchQuery = useQuery({
    queryKey: searchKey(debouncedFilter),
    queryFn: () => search(debouncedFilter),
    enabled: debouncedFilter.length > 0,
  })

  const filtered = useMemo(() => {
    return debouncedFilter.length > 0 ? searchQuery.data ?? [] : baseQuery.data ?? []
  }, [baseQuery.data, debouncedFilter.length, searchQuery.data])

  const activeQuery = debouncedFilter.length > 0 ? searchQuery : baseQuery

  return {
    filter,
    setFilter,
    debouncedFilter,
    filtered,
    baseQuery,
    searchQuery,
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    isSearching: debouncedFilter.length > 0 && searchQuery.isFetching,
  }
}
