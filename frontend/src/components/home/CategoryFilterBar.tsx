import { useMemo, useState } from 'react'
import xIcon from '../../assets/x.svg?raw'
import { InlineIcon } from '../common/InlineIcon'

const searchIcon = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M9 3.5a5.5 5.5 0 1 0 3.49 9.74l3.14 3.14a.75.75 0 0 0 1.06-1.06l-3.14-3.14A5.5 5.5 0 0 0 9 3.5Zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fill="currentColor"/></svg>`

type CategoryItem = {
  id: string
  name: string
  count: number
  canDelete: boolean
}

type CategoryFilterBarProps = {
  categories: CategoryItem[]
  selectedCategories: string[]
  uncategorizedCount: number
  uncategorizedToken: string
  isCreateCategoryPending?: boolean
  labels: {
    title: string
    uncategorized: string
    noCategories: string
    deleteCategory: string
    categorySearchPlaceholder: string
    loadMore: string
    addCategory: string
    cancel: string
  }
  onToggleCategory: (name: string) => void
  onToggleUncategorized: () => void
  onDeleteCategory: (id: string, name: string) => void
  onCreateCategory?: (name: string) => void
}

export function CategoryFilterBar({
  categories,
  selectedCategories,
  uncategorizedCount,
  uncategorizedToken,
  isCreateCategoryPending,
  labels,
  onToggleCategory,
  onToggleUncategorized,
  onDeleteCategory,
  onCreateCategory,
}: CategoryFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false)
  const categoryPreviewLimit = 10
  const trimmedSearch = searchQuery.trim()
  const normalizedSearch = trimmedSearch.toLowerCase()
  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categories
    }
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearch),
    )
  }, [categories, normalizedSearch])

  type ListItem =
    | { type: 'header'; char: string }
    | { type: 'category'; data: CategoryItem }

  const groupedItems = useMemo(() => {
    const selectedSet = new Set(selectedCategories)
    const selected: CategoryItem[] = []
    const unselected: CategoryItem[] = []

    // Split into selected and unselected
    filteredCategories.forEach((category) => {
      if (selectedSet.has(category.name)) {
        selected.push(category)
      } else {
        unselected.push(category)
      }
    })

    // Sort both groups alphabetically
    const sortFn = (a: CategoryItem, b: CategoryItem) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    
    selected.sort(sortFn)
    unselected.sort(sortFn)

    const items: ListItem[] = []

    // Add selected items first (without headers)
    selected.forEach((category) => {
      items.push({ type: 'category', data: category })
    })

    // Add unselected items with headers
    let lastChar = ''
    unselected.forEach((category) => {
      const char = category.name.charAt(0).toUpperCase()
      if (char !== lastChar) {
        items.push({ type: 'header', char })
        lastChar = char
      }
      items.push({ type: 'category', data: category })
    })

    return items
  }, [filteredCategories, selectedCategories])

  const visibleItems =
    isSearchFocused || isCategoryListExpanded
      ? groupedItems
      : groupedItems.slice(0, categoryPreviewLimit)

  const shouldShowCategoryExpand =
    !isSearchFocused &&
    !isCategoryListExpanded &&
    groupedItems.length > categoryPreviewLimit

  const hasExactCategoryMatch = useMemo(() => {
    if (!normalizedSearch) {
      return false
    }
    return categories.some((category) => category.name.toLowerCase() === normalizedSearch)
  }, [categories, normalizedSearch])
  const shouldShowCreate =
    Boolean(trimmedSearch) && !hasExactCategoryMatch && Boolean(onCreateCategory)
  const shouldEnableListScroll = isSearchFocused || isCategoryListExpanded
  const shouldShowScrollHint =
    shouldEnableListScroll && groupedItems.length > categoryPreviewLimit

  return (
    <div className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-1.5 py-1 sm:px-5 sm:py-4">
      <div className="relative">
        <InlineIcon
          svg={searchIcon}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)] [&>svg]:h-4 [&>svg]:w-4"
        />
        <input
          className="w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] py-2 pl-9 pr-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60 focus-visible:border-[var(--theme-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/30"
          type="search"
          placeholder={labels.categorySearchPlaceholder}
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onChange={(event) => {
            setIsCategoryListExpanded(false)
            setSearchQuery(event.target.value)
          }}
        />
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-muted)] opacity-70">
        {labels.title}
      </div>
      <div className="relative">
        <div
          className={`mt-2 flex flex-wrap items-center justify-start gap-2 ${
            shouldEnableListScroll ? 'max-h-40 overflow-y-auto pr-1 pb-8' : ''
          }`}
        >
        <button
          className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
            selectedCategories.includes(uncategorizedToken)
              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
              : 'border-[var(--theme-border)] text-[var(--theme-ink)]'
          }`}
          type="button"
          onClick={onToggleUncategorized}
        >
          {labels.uncategorized}{' '}
          <span
            className={`text-[10px] ${
              selectedCategories.includes(uncategorizedToken)
                ? 'text-[var(--theme-on-primary)] opacity-80'
                : 'text-[var(--theme-muted)] opacity-60'
            }`}
          >
            ({uncategorizedCount})
          </span>
        </button>
        {visibleItems.map((item, index) => {
          if (item.type === 'header') {
            return (
              <button
                key={`header-${item.char}-${index}`}
                className="flex h-[14px] w-[13px] items-center justify-center rounded-[1px] bg-[var(--theme-primary)] text-[10px] font-bold leading-none text-[var(--theme-on-primary)] hover:brightness-110"
                type="button"
                onClick={() => {
                  setSearchQuery(item.char)
                  setIsSearchFocused(true) // Optional: focus input
                }}
              >
                {item.char}
              </button>
            )
          }

          const category = item.data
          const isSelected = selectedCategories.includes(category.name)
          return (
            <div key={category.id} className="relative flex items-center">
              <button
                className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  isSelected
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                    : 'border-[var(--theme-border)] text-[var(--theme-ink)]'
                }`}
                type="button"
                onClick={() => onToggleCategory(category.name)}
              >
                {category.name}{' '}
                <span
                  className={`text-[10px] ${
                    isSelected
                      ? 'text-[var(--theme-on-primary)] opacity-80'
                      : 'text-[var(--theme-muted)] opacity-60'
                  }`}
                >
                  ({category.count})
                </span>
              </button>
              {category.canDelete && (
                <button
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[10px] text-[var(--theme-muted)] hover:opacity-80"
                  type="button"
                  onClick={() => onDeleteCategory(category.id, category.name)}
                  aria-label={labels.deleteCategory}
                >
                  <InlineIcon svg={xIcon} className="[&>svg]:h-2.5 [&>svg]:w-2.5" />
                </button>
              )}
            </div>
          )
        })}
        {shouldShowCategoryExpand && (
          <button
            className="flex h-6 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[10px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
            type="button"
            onClick={() => setIsCategoryListExpanded(true)}
          >
            ... {labels.loadMore}
          </button>
        )}
        {shouldShowCreate && (
          <div className="flex items-center gap-1">
            <button
              className="flex h-6 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[10px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
              type="button"
              onClick={() => {
                onCreateCategory?.(trimmedSearch)
                setSearchQuery('')
              }}
              disabled={isCreateCategoryPending}
            >
              '{trimmedSearch}' {labels.addCategory}
            </button>
            <button
              className="flex h-6 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[10px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
              type="button"
              onClick={() => setSearchQuery('')}
              disabled={isCreateCategoryPending}
            >
              {labels.cancel}
            </button>
          </div>
        )}
        {groupedItems.length === 0 && (
          <div className="text-xs text-[var(--theme-muted)]">
            {labels.noCategories}
          </div>
        )}
        </div>
        {shouldShowScrollHint && (
          <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-full rounded-md bg-gradient-to-t from-[var(--theme-surface)] to-transparent" />
        )}
      </div>
    </div>
  )
}
