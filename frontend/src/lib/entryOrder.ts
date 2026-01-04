import type { EntryDetail } from './api'

export const buildEntryOrder = (entries: EntryDetail[]) => {
  if (entries.length <= 1) {
    return entries
  }

  const entryById = new Map(entries.map((entry) => [entry.id, entry]))
  const childrenByParent = new Map<string, EntryDetail[]>()
  const roots: EntryDetail[] = []

  entries.forEach((entry) => {
    const parentId = entry.parentEntryId
    if (parentId && entryById.has(parentId)) {
      const children = childrenByParent.get(parentId)
      if (children) {
        children.push(entry)
      } else {
        childrenByParent.set(parentId, [entry])
      }
    } else {
      roots.push(entry)
    }
  })

  const byOrderIndex = (a: EntryDetail, b: EntryDetail) =>
    a.orderIndex === b.orderIndex
      ? a.createdAt.localeCompare(b.createdAt)
      : a.orderIndex - b.orderIndex

  roots.sort(byOrderIndex)
  childrenByParent.forEach((children) => children.sort(byOrderIndex))

  const ordered: EntryDetail[] = []
  const visited = new Set<string>()

  const walk = (entry: EntryDetail) => {
    if (visited.has(entry.id)) {
      return
    }
    visited.add(entry.id)
    ordered.push(entry)
    const children = childrenByParent.get(entry.id)
    if (!children) {
      return
    }
    children.forEach(walk)
  }

  roots.forEach(walk)
  entries.forEach((entry) => {
    if (!visited.has(entry.id)) {
      walk(entry)
    }
  })

  return ordered
}
