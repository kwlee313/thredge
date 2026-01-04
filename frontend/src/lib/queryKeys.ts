const threadsSearchRoot = ['threads', 'search'] as const
const threadsHiddenSearchRoot = ['threads', 'hidden', 'search'] as const
const entriesHiddenSearchRoot = ['entries', 'hidden', 'search'] as const

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  admin: {
    users: ['admin', 'users'] as const,
    signupPolicy: ['admin', 'signup-policy'] as const,
  },
  threads: {
    feed: ['threads', 'feed'] as const,
    feedFiltered: (date?: string | null, categoryIds?: string[]) =>
      ['threads', 'feed', { date, categoryIds }] as const,
    searchRoot: threadsSearchRoot,
    search: (query: string, categoryIds?: string[]) =>
      [...threadsSearchRoot, query, { categoryIds }] as const,
    hidden: ['threads', 'hidden'] as const,
    hiddenSearchRoot: threadsHiddenSearchRoot,
    hiddenSearch: (query: string, categoryIds?: string[]) =>
      [...threadsHiddenSearchRoot, query, { categoryIds }] as const,
  },
  thread: {
    detail: (id?: string) => ['thread', id] as const,
  },
  entries: {
    hidden: ['entries', 'hidden'] as const,
    hiddenSearchRoot: entriesHiddenSearchRoot,
    hiddenSearch: (query: string) => [...entriesHiddenSearchRoot, query] as const,
  },
  categories: ['categories'] as const,
  categoriesCounts: ['categories', 'counts'] as const,
}
