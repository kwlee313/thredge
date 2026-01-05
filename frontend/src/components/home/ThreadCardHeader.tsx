import pinIcon from '../../assets/pin.svg?raw'
import pinFilledIcon from '../../assets/pin-filled.svg?raw'
import eraserIcon from '../../assets/eraser.svg?raw'
import xIcon from '../../assets/x.svg?raw'
import type { ThreadDetail } from '../../lib/api'
import { uiTokens } from '../../lib/uiTokens'
import { InlineIcon } from '../common/InlineIcon'

type ThreadCardHeaderProps = {
  thread: ThreadDetail
  isEditing: boolean
  editingThreadCategories: string[]
  isPinPending: boolean
  isUnpinPending: boolean
  isHidePending: boolean
  labels: {
    pin: string
    unpin: string
    edit: string
    archive: string
  }
  onTogglePin: () => void
  onStartEdit: () => void
  onHide: () => void
  onEditingCategoryToggle: (name: string) => void
}

export function ThreadCardHeader({
  thread,
  isEditing,
  editingThreadCategories,
  isPinPending,
  isUnpinPending,
  isHidePending,
  labels,
  onTogglePin,
  onStartEdit,
  onHide,
  onEditingCategoryToggle,
}: ThreadCardHeaderProps) {
  return (
    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            thread.pinned
              ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
              : 'border-[var(--theme-border)] text-[var(--theme-muted)]'
          }`}
          type="button"
          onClick={onTogglePin}
          disabled={isPinPending || isUnpinPending}
          aria-label={thread.pinned ? labels.unpin : labels.pin}
        >
          <InlineIcon
            svg={thread.pinned ? pinFilledIcon : pinIcon}
            className="[&>svg]:h-3.5 [&>svg]:w-3.5"
          />
        </button>
        {isEditing
          ? editingThreadCategories.map((categoryName) => (
              <button
                key={categoryName}
                className={uiTokens.tag.solid}
                type="button"
                onClick={() => onEditingCategoryToggle(categoryName)}
              >
                {categoryName}
              </button>
            ))
          : thread.categories.map((category) => (
              <span
                key={category.id}
                className={uiTokens.tag.outline}
              >
                {category.name}
              </span>
            ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--theme-border)] text-[var(--theme-ink)]"
          type="button"
          onClick={onStartEdit}
          aria-label={labels.edit}
        >
          <InlineIcon svg={eraserIcon} className="[&>svg]:h-3.5 [&>svg]:w-3.5" />
        </button>
        <button
          className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--theme-border)] text-[9px] text-[var(--theme-muted)]"
          type="button"
          onClick={onHide}
          disabled={isHidePending}
          aria-label={labels.archive}
        >
          <InlineIcon svg={xIcon} className="[&>svg]:h-2.5 [&>svg]:w-2.5" />
        </button>
      </div>
    </div>
  )
}
