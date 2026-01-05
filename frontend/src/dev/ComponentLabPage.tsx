import { useState } from 'react'
import { EntryCard } from '../components/home/EntryCard'
import { ThreadEditor } from '../components/home/ThreadEditor'
import { EntryComposer } from '../components/home/EntryComposer'
import type { CategorySummary, EntryDetail } from '../lib/api'
import { useTextareaAutosize } from '../hooks/useTextareaAutosize'

export function ComponentLabPage() {
  const [entryBody, setEntryBody] = useState('Example entry body for preview.')
  const [replyDraft, setReplyDraft] = useState('Example reply')
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [isReplyActive, setIsReplyActive] = useState(true)
  const [editingThreadBody, setEditingThreadBody] = useState('Example thread body')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryInput, setCategoryInput] = useState('')
  const { handleTextareaInput, resizeTextarea } = useTextareaAutosize({
    deps: [entryBody, replyDraft, editingThreadBody],
  })

  const entry: EntryDetail = {
    id: 'entry-preview',
    body: entryBody,
    parentEntryId: null,
    orderIndex: 1000,
    createdAt: new Date().toISOString(),
    threadId: 'thread-preview',
  }
  const categories: CategorySummary[] = [
    { id: 'cat-1', name: 'Planning' },
    { id: 'cat-2', name: 'Notes' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Component Lab</h1>

      <section className="space-y-2">
        <div className="text-sm font-semibold">EntryCard</div>
        <EntryCard
          data={{
            entry,
            depth: 1,
            themeEntryClass: 'border-[var(--theme-border)] bg-[var(--theme-soft)]',
            highlightQuery: '',
          }}
          ui={{
            isEditing: isEditingEntry,
            editingBody: entryBody,
            isReplyActive,
            replyDraft,
            isEntryUpdatePending: false,
            isEntryHidePending: false,
            isEntryToggleMutePending: false,
            isEntryMovePending: false,
            isReplyPending: false,
            dragState: {
              activeEntryId: null,
              overEntryId: null,
              overPosition: null,
            },
            replyComposerFocusId: null,
            onReplyComposerFocusHandled: () => {},
          }}
          actions={{
            onEditStart: () => setIsEditingEntry(true),
            onEditChange: setEntryBody,
            onEditCancel: () => setIsEditingEntry(false),
            onEditSave: () => setIsEditingEntry(false),
            onToggleMute: setEntryBody,
            onHide: () => {},
            onDragStart: () => {},
            onDragEnd: () => {},
            onReplyStart: () => setIsReplyActive(true),
            onReplyChange: setReplyDraft,
            onReplyCancel: () => setIsReplyActive(false),
            onReplySubmit: () => setIsReplyActive(false),
          }}
          helpers={{
            handleTextareaInput,
            resizeTextarea,
          }}
        />
      </section>

      <section className="space-y-2">
        <div className="text-sm font-semibold">ThreadEditor</div>
        <ThreadEditor
          value={editingThreadBody}
          onChange={setEditingThreadBody}
          onSave={() => {}}
          onCancel={() => {}}
          onComplete={() => {}}
          categories={categories}
          selectedCategories={selectedCategories}
          editingCategoryInput={categoryInput}
          isCreateCategoryPending={false}
          isSaving={false}
          onToggleCategory={(name) =>
            setSelectedCategories((prev) =>
              prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
            )
          }
          onCategoryInputChange={setCategoryInput}
          onCategoryCancel={() => {
            setCategoryInput('')
          }}
          onCategorySubmit={() => {
            if (categoryInput.trim()) {
              setSelectedCategories((prev) => [...prev, categoryInput.trim()])
              setCategoryInput('')
            }
          }}
          labels={{
            save: 'Save',
            cancel: 'Cancel',
            complete: 'Complete',
            categorySearchPlaceholder: 'Find category',
            addCategory: 'Add',
            cancelCategory: 'Cancel',
            loadMore: 'Load more',
          }}
          handleTextareaInput={handleTextareaInput}
          resizeTextarea={resizeTextarea}
        />
      </section>

      <section className="space-y-2">
        <div className="text-sm font-semibold">EntryComposer</div>
        <EntryComposer
          value={entryBody}
          placeholder="Add a new entry"
          onChange={setEntryBody}
          onSubmit={() => {}}
          isSubmitting={false}
          labels={{ submit: 'Add entry' }}
          handleTextareaInput={handleTextareaInput}
          resizeTextarea={resizeTextarea}
        />
      </section>
    </div>
  )
}
