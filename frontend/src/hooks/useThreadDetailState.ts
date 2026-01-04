import { useEffect, useMemo, useState } from 'react'
import {
  useEntryEditingState,
  useReplyDraftState,
  useThreadEditingState,
} from './useThreadUiState'

const STORAGE_PREFIX = 'thredge.threadDetailDrafts:'

type ThreadDetailDrafts = {
  entryBody: string
  replyDrafts: Record<string, string>
}

type ThreadLike = {
  id: string
  body?: string | null
  categories: { name: string }[]
}

export const useThreadDetailState = (threadId?: string) => {
  const storageKey = threadId ? `${STORAGE_PREFIX}${threadId}` : null
  const storedDrafts = useMemo<ThreadDetailDrafts | null>(() => {
    if (typeof window === 'undefined' || !storageKey) {
      return null
    }
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }
    try {
      return JSON.parse(raw) as ThreadDetailDrafts
    } catch {
      return null
    }
  }, [storageKey])

  const [entryBody, setEntryBody] = useState(() => storedDrafts?.entryBody ?? '')
  const [isEditingThread, setIsEditingThread] = useState(false)
  const threadEditor = useThreadEditingState()
  const entryEditor = useEntryEditingState()
  const replyDraft = useReplyDraftState()

  const syncThread = (thread: ThreadLike) => {
    threadEditor.actions.syncThread(thread)
  }

  const startEditThread = (thread: ThreadLike) => {
    setIsEditingThread(true)
    threadEditor.actions.startEditThread(thread)
  }

  const cancelEditThread = (thread: ThreadLike) => {
    setIsEditingThread(false)
    threadEditor.actions.cancelEditThread(thread)
  }

  useEffect(() => {
    if (storedDrafts?.replyDrafts) {
      replyDraft.actions.setReplyDrafts(storedDrafts.replyDrafts)
    }
  }, [replyDraft.actions, storedDrafts])

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) {
      return
    }
    const hasDrafts =
      Boolean(entryBody.trim()) ||
      Object.values(replyDraft.state.replyDrafts).some((value) => value.trim())

    if (!hasDrafts) {
      window.localStorage.removeItem(storageKey)
      return
    }
    const payload: ThreadDetailDrafts = {
      entryBody,
      replyDrafts: replyDraft.state.replyDrafts,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [entryBody, replyDraft.state.replyDrafts, storageKey])

  return {
    state: {
      entryBody,
      replyDrafts: replyDraft.state.replyDrafts,
      activeReplyId: replyDraft.state.activeReplyId,
      editingEntryId: entryEditor.state.editingEntryId,
      editingEntryBody: entryEditor.state.editingEntryBody,
      isEditingThread,
      editingThreadBody: threadEditor.state.editingThreadBody,
      editingThreadCategories: threadEditor.state.editingThreadCategories,
      editingCategoryInput: threadEditor.state.editingCategoryInput,
      isAddingEditingCategory: threadEditor.state.isAddingEditingCategory,
    },
    actions: {
      thread: {
        setIsEditingThread,
        setEditingThreadBody: threadEditor.actions.setEditingThreadBody,
        setEditingThreadCategories: threadEditor.actions.setEditingThreadCategories,
        setEditingCategoryInput: threadEditor.actions.setEditingCategoryInput,
        setIsAddingEditingCategory: threadEditor.actions.setIsAddingEditingCategory,
        syncThread,
        startEditThread,
        cancelEditThread,
        toggleEditingCategory: threadEditor.actions.toggleEditingCategory,
      },
      entry: {
        setEntryBody,
        setEditingEntryId: entryEditor.actions.setEditingEntryId,
        setEditingEntryBody: entryEditor.actions.setEditingEntryBody,
        startEntryEdit: entryEditor.actions.startEntryEdit,
        cancelEntryEdit: entryEditor.actions.cancelEntryEdit,
      },
      reply: {
        setReplyDrafts: replyDraft.actions.setReplyDrafts,
        setActiveReplyId: replyDraft.actions.setActiveReplyId,
        startReply: replyDraft.actions.startReply,
        cancelReply: replyDraft.actions.cancelReply,
        updateReplyDraft: replyDraft.actions.updateReplyDraft,
      },
    },
  }
}
