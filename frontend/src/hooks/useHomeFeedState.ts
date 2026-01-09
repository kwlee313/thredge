import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  useEntryEditingState,
  useReplyDraftState,
  useThreadEditingState,
} from './useThreadUiState'

const STORAGE_KEY = 'thredge.homeFeedDrafts'

const parseCategoryPath = (value?: string) => {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((item) => decodeURIComponent(item))
    .filter(Boolean)
}

const buildCategoryPath = (names: string[]) =>
  names.map((name) => encodeURIComponent(name)).join(',')

type HomeFeedDrafts = {
  threadBody: string
  entryDrafts: Record<string, string>
  replyDrafts: Record<string, string>
  editingThreadId?: string | null
  editingThreadBody?: string
  editingThreadCategories?: string[]
  editingCategoryInput?: string
  isAddingEditingCategory?: boolean
  editingEntryId?: string | null
  editingEntryBody?: string
}

type ThreadLike = {
  id: string
  body?: string | null
  categories: { name: string }[]
}

export const useHomeFeedState = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categoryPath } = useParams<{ categoryPath?: string }>()
  const navigate = useNavigate()
  const hasRestoredFromStorage = useRef(false)

  const storedDrafts = useMemo<HomeFeedDrafts | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    try {
      return JSON.parse(raw) as HomeFeedDrafts
    } catch {
      return null
    }
  }, [])

  const [threadBody, setThreadBody] = useState(() => storedDrafts?.threadBody ?? '')
  // URL-synced states
  const queryCategories = useMemo(
    () => searchParams.get('c')?.split(',').filter(Boolean) ?? [],
    [searchParams],
  )
  const selectedCategories = useMemo(() => {
    const pathCategories = parseCategoryPath(categoryPath)
    if (pathCategories.length > 0) {
      return pathCategories
    }
    return queryCategories
  }, [categoryPath, queryCategories])

  const searchQuery = searchParams.get('q') ?? ''
  const activeComposerTab = (searchParams.get('tab') as 'new' | 'search') ?? 'new' // 'tab' param for UI state

  const setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>> = useCallback((update) => {
    const next = typeof update === 'function' ? update(selectedCategories) : update
    const nextPath = buildCategoryPath(next)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('c')
    const search = newParams.toString()
    const targetPath = nextPath ? `/categories/${nextPath}` : '/'
    navigate(search ? `${targetPath}?${search}` : targetPath, { replace: true })
  }, [navigate, searchParams, selectedCategories])

  const setSearchQueryState = useCallback((query: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      if (query) {
        newParams.set('q', query)
        newParams.set('tab', 'search') // implicit tab switch
      } else {
        newParams.delete('q')
      }
      return newParams
    }, { replace: true })
  }, [setSearchParams])

  const setActiveComposerTabState = useCallback((tab: 'new' | 'search') => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.set('tab', tab)
      // clear search query if switching away from search tab? 
      // Maybe not, the user might want to keep the search. 
      // But if they switch to 'new', search query might be confusing.
      // For now, let's just update the tab.
      return newParams
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    if (queryCategories.length === 0) {
      return
    }
    const pathCategories = parseCategoryPath(categoryPath)
    if (pathCategories.length > 0) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('c')
        return next
      }, { replace: true })
      return
    }
    const nextPath = buildCategoryPath(queryCategories)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('c')
    const search = newParams.toString()
    navigate(search ? `/categories/${nextPath}?${search}` : `/categories/${nextPath}`, {
      replace: true,
    })
  }, [
    categoryPath,
    navigate,
    queryCategories,
    searchParams,
    setSearchParams,
  ])

  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>(
    () => storedDrafts?.entryDrafts ?? {},
  )
  const [editingThreadId, setEditingThreadId] = useState<string | null>(
    () => storedDrafts?.editingThreadId ?? null,
  )

  const threadEditor = useThreadEditingState()
  const entryEditor = useEntryEditingState()
  const replyDraft = useReplyDraftState()
  const {
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
    isAddingEditingCategory,
  } = threadEditor.state
  const { editingEntryId, editingEntryBody } = entryEditor.state

  const startEditThread = (thread: ThreadLike) => {
    setEditingThreadId(thread.id)
    threadEditor.actions.startEditThread(thread)
  }

  const cancelEditThread = () => {
    setEditingThreadId(null)
    threadEditor.actions.cancelEditThread(null)
  }

  const updateEntryDraft = (threadId: string, value: string) => {
    setEntryDrafts((prev) => ({
      ...prev,
      [threadId]: value,
    }))
  }

  useEffect(() => {
    if (hasRestoredFromStorage.current) {
      return
    }
    hasRestoredFromStorage.current = true

    if (storedDrafts?.replyDrafts) {
      replyDraft.actions.setReplyDrafts(storedDrafts.replyDrafts)
    }
    if (storedDrafts?.editingThreadId) {
      setEditingThreadId(storedDrafts.editingThreadId)
    }
    if (storedDrafts?.editingThreadBody !== undefined) {
      threadEditor.actions.setEditingThreadBody(storedDrafts.editingThreadBody)
    }
    if (storedDrafts?.editingThreadCategories) {
      threadEditor.actions.setEditingThreadCategories(storedDrafts.editingThreadCategories)
    }
    if (storedDrafts?.editingCategoryInput !== undefined) {
      threadEditor.actions.setEditingCategoryInput(storedDrafts.editingCategoryInput)
    }
    if (storedDrafts?.isAddingEditingCategory !== undefined) {
      threadEditor.actions.setIsAddingEditingCategory(storedDrafts.isAddingEditingCategory)
    }
    if (storedDrafts?.editingEntryId) {
      entryEditor.actions.setEditingEntryId(storedDrafts.editingEntryId)
    }
    if (storedDrafts?.editingEntryBody !== undefined) {
      entryEditor.actions.setEditingEntryBody(storedDrafts.editingEntryBody)
    }
  }, [
    entryEditor.actions,
    replyDraft.actions,
    storedDrafts,
    threadEditor.actions,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const hasDrafts =
      Boolean(threadBody.trim()) ||
      Boolean(editingThreadId) ||
      Boolean(editingEntryId) ||
      Boolean(editingThreadBody.trim()) ||
      editingThreadCategories.length > 0 ||
      Boolean(editingCategoryInput.trim()) ||
      isAddingEditingCategory ||
      Boolean(editingEntryBody.trim()) ||
      Object.values(entryDrafts).some((value) => value.trim()) ||
      Object.values(replyDraft.state.replyDrafts).some((value) => value.trim())

    if (!hasDrafts) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    const timer = setTimeout(() => {
      const payload: HomeFeedDrafts = {
        threadBody,
        entryDrafts,
        replyDrafts: replyDraft.state.replyDrafts,
        editingThreadId,
        editingThreadBody,
        editingThreadCategories,
        editingCategoryInput,
        isAddingEditingCategory,
        editingEntryId,
        editingEntryBody,
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    }, 500)

    return () => clearTimeout(timer)
  }, [
    threadBody,
    editingThreadId,
    editingThreadBody,
    editingThreadCategories,
    editingCategoryInput,
    isAddingEditingCategory,
    editingEntryId,
    editingEntryBody,
    entryDrafts,
    replyDraft.state.replyDrafts,
  ])

  return {
    state: {
      threadBody,
      selectedCategories,
      entryDrafts,
      replyDrafts: replyDraft.state.replyDrafts,
      activeReplyId: replyDraft.state.activeReplyId,
      editingThreadId,
      editingThreadBody: threadEditor.state.editingThreadBody,
      editingThreadCategories: threadEditor.state.editingThreadCategories,
      editingCategoryInput: threadEditor.state.editingCategoryInput,
      isAddingEditingCategory: threadEditor.state.isAddingEditingCategory,
      editingEntryId: entryEditor.state.editingEntryId,
      editingEntryBody: entryEditor.state.editingEntryBody,
      searchQuery,
      activeComposerTab,
    },
    actions: {
      thread: {
        setThreadBody,
        setSelectedCategories,
        setEditingThreadId,
        setEditingThreadBody: threadEditor.actions.setEditingThreadBody,
        setEditingThreadCategories: threadEditor.actions.setEditingThreadCategories,
        setEditingCategoryInput: threadEditor.actions.setEditingCategoryInput,
        setIsAddingEditingCategory: threadEditor.actions.setIsAddingEditingCategory,
        startEditThread,
        cancelEditThread,
        toggleEditingCategory: threadEditor.actions.toggleEditingCategory,
      },
      entry: {
        setEditingEntryId: entryEditor.actions.setEditingEntryId,
        setEditingEntryBody: entryEditor.actions.setEditingEntryBody,
        startEntryEdit: entryEditor.actions.startEntryEdit,
        cancelEntryEdit: entryEditor.actions.cancelEntryEdit,
        updateEntryDraft,
      },
      reply: {
        setActiveReplyId: replyDraft.actions.setActiveReplyId,
        setReplyDrafts: replyDraft.actions.setReplyDrafts,
        startReply: replyDraft.actions.startReply,
        cancelReply: replyDraft.actions.cancelReply,
        updateReplyDraft: replyDraft.actions.updateReplyDraft,
      },
      ui: {
        setSearchQuery: setSearchQueryState,
        setActiveComposerTab: setActiveComposerTabState,
      },
    },
  }
}
