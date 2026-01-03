import { API_BASE_URL } from './env'

export type BackendHealth = { status: string }
export type AuthUser = { username: string }
export type ThreadSummary = {
  id: string
  title: string
  lastActivityAt: string
  categories: CategorySummary[]
  pinned: boolean
}
export type EntryDetail = {
  id: string
  body: string
  parentEntryId: string | null
  createdAt: string
  threadId?: string | null
}
export type CategorySummary = {
  id: string
  name: string
}
export type ThreadDetail = {
  id: string
  title: string
  body: string | null
  createdAt: string
  lastActivityAt: string
  categories: CategorySummary[]
  pinned: boolean
  entries: EntryDetail[]
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Backend health failed: ${response.status}`)
  }
  return (await response.json()) as BackendHealth
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Auth check failed: ${response.status}`)
  }
  return (await response.json()) as AuthUser
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }
  return (await response.json()) as AuthUser
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Logout failed: ${response.status}`)
  }
}

export async function fetchThreads(): Promise<ThreadSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/threads`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Threads fetch failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary[]
}

export async function createThread(
  body?: string | null,
  categoryNames: string[] = [],
): Promise<ThreadSummary> {
  const response = await fetch(`${API_BASE_URL}/api/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body, categoryNames }),
  })
  if (!response.ok) {
    throw new Error(`Thread create failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary
}

export async function fetchThread(id: string): Promise<ThreadDetail> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}?includeHidden=true`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread fetch failed: ${response.status}`)
  }
  return (await response.json()) as ThreadDetail
}

export async function addEntry(
  threadId: string,
  body: string,
  parentEntryId?: string,
): Promise<EntryDetail> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body, parentEntryId }),
  })
  if (!response.ok) {
    throw new Error(`Entry create failed: ${response.status}`)
  }
  return (await response.json()) as EntryDetail
}

export async function fetchThreadFeed(): Promise<ThreadDetail[]> {
  const response = await fetch(`${API_BASE_URL}/api/threads/feed`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread feed fetch failed: ${response.status}`)
  }
  return (await response.json()) as ThreadDetail[]
}

export async function searchThreads(query: string): Promise<ThreadDetail[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/threads/search?query=${encodeURIComponent(query)}`,
    {
      credentials: 'include',
    },
  )
  if (!response.ok) {
    throw new Error(`Thread search failed: ${response.status}`)
  }
  return (await response.json()) as ThreadDetail[]
}

export async function updateThread(
  id: string,
  body: string | null,
  categoryNames: string[],
): Promise<ThreadSummary> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body, categoryNames }),
  })
  if (!response.ok) {
    throw new Error(`Thread update failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary
}

export async function hideThread(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread hide failed: ${response.status}`)
  }
}

export async function updateEntry(id: string, body: string): Promise<EntryDetail> {
  const response = await fetch(`${API_BASE_URL}/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body }),
  })
  if (!response.ok) {
    throw new Error(`Entry update failed: ${response.status}`)
  }
  return (await response.json()) as EntryDetail
}

export async function hideEntry(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/entries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Entry hide failed: ${response.status}`)
  }
}

export async function restoreEntry(id: string): Promise<EntryDetail> {
  const response = await fetch(`${API_BASE_URL}/api/entries/${id}/restore`, {
    method: 'PATCH',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Entry restore failed: ${response.status}`)
  }
  return (await response.json()) as EntryDetail
}

export async function fetchHiddenEntries(): Promise<EntryDetail[]> {
  const response = await fetch(`${API_BASE_URL}/api/entries/hidden`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Hidden entries fetch failed: ${response.status}`)
  }
  return (await response.json()) as EntryDetail[]
}

export async function searchHiddenEntries(query: string): Promise<EntryDetail[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/entries/hidden/search?query=${encodeURIComponent(query)}`,
    {
      credentials: 'include',
    },
  )
  if (!response.ok) {
    throw new Error(`Hidden entries search failed: ${response.status}`)
  }
  return (await response.json()) as EntryDetail[]
}

export async function fetchHiddenThreads(): Promise<ThreadSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/threads/hidden`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Hidden threads fetch failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary[]
}

export async function searchHiddenThreads(query: string): Promise<ThreadSummary[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/threads/hidden/search?query=${encodeURIComponent(query)}`,
    {
      credentials: 'include',
    },
  )
  if (!response.ok) {
    throw new Error(`Hidden threads search failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary[]
}

export async function restoreThread(id: string): Promise<ThreadSummary> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}/restore`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread restore failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary
}

export async function pinThread(id: string): Promise<ThreadSummary> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}/pin`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread pin failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary
}

export async function unpinThread(id: string): Promise<ThreadSummary> {
  const response = await fetch(`${API_BASE_URL}/api/threads/${id}/unpin`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Thread unpin failed: ${response.status}`)
  }
  return (await response.json()) as ThreadSummary
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/categories`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Categories fetch failed: ${response.status}`)
  }
  return (await response.json()) as CategorySummary[]
}

export async function createCategory(name: string): Promise<CategorySummary> {
  const response = await fetch(`${API_BASE_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw new Error(`Category create failed: ${response.status}`)
  }
  return (await response.json()) as CategorySummary
}

export async function updateCategory(id: string, name: string): Promise<CategorySummary> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw new Error(`Category update failed: ${response.status}`)
  }
  return (await response.json()) as CategorySummary
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Category delete failed: ${response.status}`)
  }
}
