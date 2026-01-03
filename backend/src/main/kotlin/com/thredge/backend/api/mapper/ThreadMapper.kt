package com.thredge.backend.api.mapper

import com.thredge.backend.api.dto.CategorySummary
import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.ThreadDetail
import com.thredge.backend.api.dto.ThreadSummary
import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.entity.ThreadEntity
import org.springframework.stereotype.Component

@Component
class ThreadMapper {
    fun toCategorySummary(category: CategoryEntity): CategorySummary =
        CategorySummary(
            id = category.id.toString(),
            name = category.name,
        )

    fun toThreadSummary(thread: ThreadEntity): ThreadSummary =
        ThreadSummary(
            id = thread.id.toString(),
            title = thread.title,
            lastActivityAt = thread.lastActivityAt,
            categories = thread.categories.sortedBy { it.name }.map(::toCategorySummary),
            pinned = thread.isPinned,
        )

    fun toThreadDetail(thread: ThreadEntity, entries: List<EntryEntity>): ThreadDetail =
        ThreadDetail(
            id = thread.id.toString(),
            title = thread.title,
            body = thread.body,
            createdAt = thread.createdAt,
            lastActivityAt = thread.lastActivityAt,
            categories = thread.categories.sortedBy { it.name }.map(::toCategorySummary),
            pinned = thread.isPinned,
            entries = entries.filter { !it.isHidden }.map { toEntryDetail(it, thread.id) },
        )

    fun toEntryDetail(entry: EntryEntity, threadId: java.util.UUID? = entry.thread?.id): EntryDetail =
        EntryDetail(
            id = entry.id.toString(),
            body = entry.body,
            parentEntryId = entry.parentEntryId?.toString(),
            createdAt = entry.createdAt,
            threadId = threadId?.toString(),
        )
}
