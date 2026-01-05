import { API_BASE_URL } from './env'

export type BackendHealth = { status: string }
export type AuthUser = { username: string; role: 'USER' | 'ADMIN' }
export type AdminUser = {
  id: string
  username: string
  role: 'USER' | 'ADMIN'
  createdAt: string
}
export type SignupPolicy = { enabled: boolean }
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
  orderIndex: number
  createdAt: string
  threadId?: string | null
}
export type EntryMoveDirection = 'UP' | 'DOWN'
export type EntryMovePosition = 'BEFORE' | 'AFTER' | 'CHILD'
export type CategorySummary = {
  id: string
  name: string
}
export type CategoryCountSummary = {
  id: string
  count: number
}
export type CategoryCountsResponse = {
  counts: CategoryCountSummary[]
  uncategorizedCount: number
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
export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  hasNext: boolean
}

export const THREAD_PAGE_SIZE = 20
export const ENTRY_PAGE_SIZE = 50

const requestJson = async <T>(
  path: string,
  init: RequestInit,
  errorLabel: string,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  })
  if (!response.ok) {
    let message = `${response.status}`
    try {
      const data = (await response.json()) as { message?: string }
      if (data?.message) {
        message = data.message
      }
    } catch {
      // Ignore response parsing errors for non-JSON bodies.
    }
    throw new Error(`${errorLabel}: ${message}`)
  }
  return (await response.json()) as T
}

const requestEmpty = async (path: string, init: RequestInit, errorLabel: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  })
  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status}`)
  }
}

const buildPagedPath = (path: string, page: number, size: number) => {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}page=${page}&size=${size}`
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  return requestJson('/api/health', {}, 'Backend health failed')
}

export async function fetchMe(): Promise<AuthUser> {
  return requestJson('/api/auth/me', {}, 'Auth check failed')
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, 'Login failed')
}

export async function signup(username: string, password: string): Promise<AuthUser> {
  return requestJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, 'Signup failed')
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return requestJson('/api/admin/users', {}, 'Admin users fetch failed')
}

export async function deleteAdminUser(id: string): Promise<void> {
  return requestEmpty(`/api/admin/users/${id}`, {
    method: 'DELETE',
  }, 'Admin user delete failed')
}

export async function fetchSignupPolicy(): Promise<SignupPolicy> {
  return requestJson('/api/admin/signup-policy', {}, 'Signup policy fetch failed')
}

export async function updateSignupPolicy(enabled: boolean): Promise<SignupPolicy> {
  return requestJson('/api/admin/signup-policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  }, 'Signup policy update failed')
}

export async function logout(): Promise<void> {
  return requestEmpty('/api/auth/logout', {
    method: 'POST',
  }, 'Logout failed')
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return requestEmpty('/api/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }, 'Password change failed')
}

export async function fetchThreadsPage(
  page: number,
  size: number = THREAD_PAGE_SIZE,
): Promise<PageResponse<ThreadSummary>> {
  return requestJson(
    buildPagedPath('/api/threads', page, size),
    {},
    'Threads fetch failed',
  )
}

export async function createThread(
  body?: string | null,
  categoryNames: string[] = [],
): Promise<ThreadSummary> {
  return requestJson('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, categoryNames }),
  }, 'Thread create failed')
}

export async function fetchThread(id: string): Promise<ThreadDetail> {
  return requestJson(`/api/threads/${id}?includeHidden=true`, {}, 'Thread fetch failed')
}

export async function addEntry(
  threadId: string,
  body: string,
  parentEntryId?: string,
): Promise<EntryDetail> {
  return requestJson(`/api/threads/${threadId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, parentEntryId }),
  }, 'Entry create failed')
}

export type FeedFilterOptions = {
  date?: string // YYYY-MM-DD format
  categoryIds?: string[]
}

export async function fetchThreadFeedPage(
  page: number,
  size: number = THREAD_PAGE_SIZE,
  filters?: FeedFilterOptions,
): Promise<PageResponse<ThreadDetail>> {
  let path = buildPagedPath('/api/threads/feed', page, size)
  if (filters?.date) {
    path += `&date=${encodeURIComponent(filters.date)}`
  }
  if (filters?.categoryIds && filters.categoryIds.length > 0) {
    filters.categoryIds.forEach((id) => {
      path += `&categoryIds=${encodeURIComponent(id)}`
    })
  }
  return requestJson(path, {}, 'Thread feed fetch failed')
}

export async function searchThreadsPage(
  query: string,
  page: number,
  size: number = THREAD_PAGE_SIZE,
  categoryIds?: string[],
): Promise<PageResponse<ThreadDetail>> {
  let path = buildPagedPath(`/api/threads/search?query=${encodeURIComponent(query)}`, page, size)
  if (categoryIds && categoryIds.length > 0) {
    categoryIds.forEach((id) => {
      path += `&categoryIds=${encodeURIComponent(id)}`
    })
  }
  return requestJson(path, {}, 'Thread search failed')
}

export async function updateThread(
  id: string,
  body: string | null,
  categoryNames: string[],
): Promise<ThreadSummary> {
  return requestJson(`/api/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, categoryNames }),
  }, 'Thread update failed')
}

export async function hideThread(id: string): Promise<void> {
  return requestEmpty(`/api/threads/${id}`, {
    method: 'DELETE',
  }, 'Thread hide failed')
}

export async function updateEntry(id: string, body: string): Promise<EntryDetail> {
  return requestJson(`/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  }, 'Entry update failed')
}

export async function moveEntry(
  id: string,
  direction: EntryMoveDirection,
): Promise<EntryDetail> {
  return requestJson(`/api/entries/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  }, 'Entry move failed')
}

export async function moveEntryTo(
  id: string,
  targetEntryId: string,
  position: EntryMovePosition,
): Promise<EntryDetail> {
  return requestJson(`/api/entries/${id}/move-to`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEntryId, position }),
  }, 'Entry move failed')
}

export async function hideEntry(id: string): Promise<void> {
  return requestEmpty(`/api/entries/${id}`, {
    method: 'DELETE',
  }, 'Entry hide failed')
}

export async function restoreEntry(id: string): Promise<EntryDetail> {
  return requestJson(`/api/entries/${id}/restore`, {
    method: 'PATCH',
  }, 'Entry restore failed')
}

export async function fetchHiddenEntriesPage(
  page: number,
  size: number = ENTRY_PAGE_SIZE,
): Promise<PageResponse<EntryDetail>> {
  return requestJson(
    buildPagedPath('/api/entries/hidden', page, size),
    {},
    'Hidden entries fetch failed',
  )
}

export async function searchHiddenEntriesPage(
  query: string,
  page: number,
  size: number = ENTRY_PAGE_SIZE,
): Promise<PageResponse<EntryDetail>> {
  return requestJson(
    buildPagedPath(`/api/entries/hidden/search?query=${encodeURIComponent(query)}`, page, size),
    {},
    'Hidden entries search failed',
  )
}

export async function fetchHiddenThreadsPage(
  page: number,
  size: number = THREAD_PAGE_SIZE,
): Promise<PageResponse<ThreadSummary>> {
  return requestJson(
    buildPagedPath('/api/threads/hidden', page, size),
    {},
    'Hidden threads fetch failed',
  )
}

export async function searchHiddenThreadsPage(
  query: string,
  page: number,
  size: number = THREAD_PAGE_SIZE,
  categoryIds?: string[],
): Promise<PageResponse<ThreadSummary>> {
  let path = buildPagedPath(`/api/threads/hidden/search?query=${encodeURIComponent(query)}`, page, size)
  if (categoryIds && categoryIds.length > 0) {
    categoryIds.forEach((id) => {
      path += `&categoryIds=${encodeURIComponent(id)}`
    })
  }
  return requestJson(path, {}, 'Hidden threads search failed')
}

export async function restoreThread(id: string): Promise<ThreadSummary> {
  return requestJson(`/api/threads/${id}/restore`, {
    method: 'POST',
  }, 'Thread restore failed')
}

export async function pinThread(id: string): Promise<ThreadSummary> {
  return requestJson(`/api/threads/${id}/pin`, {
    method: 'POST',
  }, 'Thread pin failed')
}

export async function unpinThread(id: string): Promise<ThreadSummary> {
  return requestJson(`/api/threads/${id}/unpin`, {
    method: 'POST',
  }, 'Thread unpin failed')
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  return requestJson('/api/categories', {}, 'Categories fetch failed')
}

export async function fetchCategoryCounts(): Promise<CategoryCountsResponse> {
  return requestJson('/api/categories/counts', {}, 'Category counts fetch failed')
}

export async function createCategory(name: string): Promise<CategorySummary> {
  return requestJson('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }, 'Category create failed')
}

export async function updateCategory(id: string, name: string): Promise<CategorySummary> {
  return requestJson(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }, 'Category update failed')
}

export async function deleteCategory(id: string): Promise<void> {
  return requestEmpty(`/api/categories/${id}`, {
    method: 'DELETE',
  }, 'Category delete failed')
}
