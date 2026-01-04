import { useMemo, useState } from 'react'

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
  labels: {
    title: string
    uncategorized: string
    noCategories: string
    deleteCategory: string
    categorySearchPlaceholder: string
    loadMore: string
  }
  onToggleCategory: (name: string) => void
  onToggleUncategorized: () => void
  onDeleteCategory: (id: string, name: string) => void
}

export function CategoryFilterBar({
  categories,
  selectedCategories,
  uncategorizedCount,
  uncategorizedToken,
  labels,
  onToggleCategory,
  onToggleUncategorized,
  onDeleteCategory,
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
  const orderedCategories = useMemo(() => {
    const selectedSet = new Set(selectedCategories)
    const selected: CategoryItem[] = []
    const unselected: CategoryItem[] = []
    filteredCategories.forEach((category) => {
      if (selectedSet.has(category.name)) {
        selected.push(category)
      } else {
        unselected.push(category)
      }
    })
    return [...selected, ...unselected]
  }, [filteredCategories, selectedCategories])
  const visibleCategories =
    isSearchFocused || isCategoryListExpanded
      ? orderedCategories
      : orderedCategories.slice(0, categoryPreviewLimit)
  const shouldShowCategoryExpand =
    !isSearchFocused &&
    !isCategoryListExpanded &&
    orderedCategories.length > categoryPreviewLimit

  return (
    <div className="rounded-md border border-[var(--theme-border)] px-1.5 py-1 sm:px-3 sm:py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-muted)]">
          {labels.title}
        </div>
        <input
          className="w-[110px] rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] placeholder:opacity-60"
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
      <div className="mt-1 flex flex-wrap gap-2 sm:mt-2">
        <button
          className={`rounded-full border px-3 py-1 text-xs ${
            selectedCategories.includes(uncategorizedToken)
              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
              : 'border-[var(--theme-border)] text-[var(--theme-ink)]'
          }`}
          type="button"
          onClick={onToggleUncategorized}
        >
          {labels.uncategorized}{' '}
          <span className="text-[10px] text-[var(--theme-muted)] opacity-60">
            ({uncategorizedCount})
          </span>
        </button>
        {visibleCategories.map((category) => {
          const isSelected = selectedCategories.includes(category.name)
          return (
            <div key={category.id} className="relative flex items-center">
              <button
                className={`rounded-full border px-3 py-1 text-xs ${
                  isSelected
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                    : 'border-[var(--theme-border)] text-[var(--theme-ink)]'
                }`}
                type="button"
                onClick={() => onToggleCategory(category.name)}
              >
                {category.name}{' '}
                <span className="text-[10px] text-[var(--theme-muted)] opacity-60">
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
                  ×
                </button>
              )}
            </div>
          )
        })}
        {shouldShowCategoryExpand && (
          <button
            className="flex h-7 items-center justify-center rounded-full border border-[var(--theme-border)] px-2 text-[11px] font-semibold text-[var(--theme-ink)] transition-all hover:opacity-80"
            type="button"
            onClick={() => setIsCategoryListExpanded(true)}
          >
            ... {labels.loadMore}
          </button>
        )}
        {orderedCategories.length === 0 && (
          <div className="text-xs text-[var(--theme-muted)]">
            {labels.noCategories}
          </div>
        )}
      </div>
    </div>
  )
}
