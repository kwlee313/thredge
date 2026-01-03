const threadsSearchRoot = ['threads', 'search'] as const
const threadsHiddenSearchRoot = ['threads', 'hidden', 'search'] as const
const entriesHiddenSearchRoot = ['entries', 'hidden', 'search'] as const

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  threads: {
    feed: ['threads', 'feed'] as const,
    searchRoot: threadsSearchRoot,
    search: (query: string) => [...threadsSearchRoot, query] as const,
    hidden: ['threads', 'hidden'] as const,
    hiddenSearchRoot: threadsHiddenSearchRoot,
    hiddenSearch: (query: string) => [...threadsHiddenSearchRoot, query] as const,
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
}
