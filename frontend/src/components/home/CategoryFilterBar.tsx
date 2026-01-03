type CategoryItem = {
  id: string
  name: string
  count: number
  totalCount: number
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
  return (
    <div className="rounded-md border border-gray-200 px-1.5 py-1 sm:px-3 sm:py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {labels.title}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 sm:mt-2">
        <button
          className={`rounded-full border px-3 py-1 text-xs ${
            selectedCategories.includes(uncategorizedToken)
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 text-gray-700'
          }`}
          type="button"
          onClick={onToggleUncategorized}
        >
          {labels.uncategorized}{' '}
          <span className="text-[10px] text-gray-500">({uncategorizedCount})</span>
        </button>
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.name)
          return (
            <div key={category.id} className="relative flex items-center">
              <button
                className={`rounded-full border px-3 py-1 text-xs ${
                  isSelected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700'
                }`}
                type="button"
                onClick={() => onToggleCategory(category.name)}
              >
                {category.name}{' '}
                <span className="text-[10px] text-gray-500">({category.count})</span>
              </button>
              {category.canDelete && (
                <button
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] text-gray-500 hover:text-gray-900"
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
        {categories.length === 0 && (
          <div className="text-xs text-gray-500">{labels.noCategories}</div>
        )}
      </div>
    </div>
  )
}
