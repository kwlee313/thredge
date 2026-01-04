import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useEntryEditingState,
  useReplyDraftState,
  useThreadEditingState,
} from './useThreadUiState'

const STORAGE_KEY = 'thredge.homeFeedDrafts'

type HomeFeedDrafts = {
  threadBody: string
  newThreadCategories: string[]
  entryDrafts: Record<string, string>
  replyDrafts: Record<string, string>
}

type ThreadLike = {
  id: string
  body?: string | null
  categories: { name: string }[]
}

export const useHomeFeedState = () => {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [newThreadCategories, setNewThreadCategories] = useState<string[]>(
    () => storedDrafts?.newThreadCategories ?? [],
  )

  // URL-synced states
  const selectedCategories = useMemo(
    () => searchParams.get('c')?.split(',').filter(Boolean) ?? [],
    [searchParams]
  )

  const searchQuery = searchParams.get('q') ?? ''
  const activeComposerTab = (searchParams.get('tab') as 'new' | 'search') ?? 'new' // 'tab' param for UI state

  const setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>> = useCallback((update) => {
    setSearchParams((prev) => {
      const current = prev.get('c')?.split(',').filter(Boolean) ?? []
      const next = typeof update === 'function' ? update(current) : update

      const newParams = new URLSearchParams(prev)
      if (next.length > 0) {
        newParams.set('c', next.join(','))
      } else {
        newParams.delete('c')
      }
      return newParams
    }, { replace: true })
  }, [setSearchParams])

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

  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>(
    () => storedDrafts?.entryDrafts ?? {},
  )
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)

  const threadEditor = useThreadEditingState()
  const entryEditor = useEntryEditingState()
  const replyDraft = useReplyDraftState()

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
  }, [
    replyDraft.actions,
    storedDrafts,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const hasDrafts =
      Boolean(threadBody.trim()) ||
      newThreadCategories.length > 0 ||
      Object.values(entryDrafts).some((value) => value.trim()) ||
      Object.values(replyDraft.state.replyDrafts).some((value) => value.trim())

    if (!hasDrafts) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    const payload: HomeFeedDrafts = {
      threadBody,
      newThreadCategories,
      entryDrafts,
      replyDrafts: replyDraft.state.replyDrafts,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    threadBody,
    newThreadCategories,
    entryDrafts,
    replyDraft.state.replyDrafts,
  ])

  return {
    state: {
      threadBody,
      newThreadCategories,
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
        setNewThreadCategories,
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
