package com.thredge.backend.service

import com.thredge.backend.api.dto.EntryRequest
import com.thredge.backend.api.dto.ThreadDetail
import com.thredge.backend.api.dto.ThreadRequest
import com.thredge.backend.api.dto.ThreadSummary
import com.thredge.backend.api.mapper.ThreadMapper
import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.entity.ThreadEntity
import com.thredge.backend.domain.repository.CategoryRepository
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class ThreadService(
    private val threadRepository: ThreadRepository,
    private val entryRepository: EntryRepository,
    private val categoryRepository: CategoryRepository,
    private val threadMapper: ThreadMapper,
) {
    fun list(ownerUsername: String): List<ThreadSummary> =
        threadRepository.findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(ownerUsername)
            .map(threadMapper::toThreadSummary)

    fun feed(ownerUsername: String): List<ThreadDetail> {
        val threads = threadRepository.findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(ownerUsername)
        return threads.map { thread ->
            val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
            threadMapper.toThreadDetail(thread, entries)
        }
    }

    fun searchThreads(ownerUsername: String, query: String): List<ThreadDetail> {
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        val threads = threadRepository.searchVisibleThreads(ownerUsername, trimmedQuery)
        return threads.map { thread ->
            val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
            threadMapper.toThreadDetail(thread, entries)
        }
    }

    fun listHidden(ownerUsername: String): List<ThreadSummary> =
        threadRepository.findByOwnerUsernameAndIsHiddenTrueOrderByLastActivityAtDesc(ownerUsername)
            .map(threadMapper::toThreadSummary)

    fun searchHidden(ownerUsername: String, query: String): List<ThreadSummary> {
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        return threadRepository.searchHiddenThreads(ownerUsername, trimmedQuery)
            .map(threadMapper::toThreadSummary)
    }

    fun createThread(ownerUsername: String, request: ThreadRequest): ThreadSummary {
        val body = request.body?.trim().orEmpty()
        if (body.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
        }
        val title = deriveTitle(body)
        val categories = resolveCategories(request.categoryNames, ownerUsername)
        val thread =
            ThreadEntity(
                title = title,
                body = body,
                ownerUsername = ownerUsername,
            ).apply {
                this.categories = categories.toMutableSet()
            }
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    fun getThread(ownerUsername: String, id: String, includeHidden: Boolean): ThreadDetail {
        val thread = findThread(id, ownerUsername, includeHidden = includeHidden)
        val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
        return threadMapper.toThreadDetail(thread, entries)
    }

    fun updateThread(ownerUsername: String, id: String, request: ThreadRequest): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        val newBody = request.body?.trim()
        if (newBody != null) {
            if (newBody.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
            }
            thread.body = newBody
            thread.title = deriveTitle(newBody)
        } else if (!request.title.isNullOrBlank()) {
            thread.title = request.title.trim()
        }
        thread.categories = resolveCategories(request.categoryNames, ownerUsername).toMutableSet()
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    fun hideThread(ownerUsername: String, id: String) {
        val thread = findThread(id, ownerUsername)
        thread.isHidden = true
        threadRepository.save(thread)
    }

    fun restoreThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername, includeHidden = true)
        thread.isHidden = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    fun pinThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        thread.isPinned = true
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    fun unpinThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        thread.isPinned = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    fun addEntry(ownerUsername: String, threadId: String, request: EntryRequest): EntryDetail {
        if (request.body.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
        }
        val thread = findThread(threadId, ownerUsername)
        val parentEntryId = request.parentEntryId?.let {
            runCatching { UUID.fromString(it) }.getOrElse {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid parent entry id.")
            }
        }
        val parentDepth = parentEntryId?.let { resolveEntryDepth(it, thread.id!!) } ?: 0
        if (parentDepth >= 3) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply depth limit reached.")
        }
        val entry =
            entryRepository.save(
                EntryEntity(
                    thread = thread,
                    body = request.body.trim(),
                    parentEntryId = parentEntryId,
                ),
            )
        thread.lastActivityAt = Instant.now()
        threadRepository.save(thread)
        return threadMapper.toEntryDetail(entry)
    }

    private fun findThread(
        id: String,
        ownerUsername: String,
        includeHidden: Boolean = false,
    ): ThreadEntity {
        val uuid =
            runCatching { UUID.fromString(id) }.getOrNull()
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid thread id.")
        val thread = threadRepository.findByIdAndOwnerUsername(uuid, ownerUsername) ?: throw ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Thread not found.",
        )
        if (thread.isHidden && !includeHidden) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Thread not found.")
        }
        return thread
    }

    private fun resolveCategories(
        rawNames: List<String>,
        ownerUsername: String,
    ): List<CategoryEntity> {
        val names = rawNames.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        if (names.isEmpty()) {
            return emptyList()
        }
        val existing = categoryRepository.findByOwnerUsernameAndNameIn(ownerUsername, names)
        val existingNames = existing.map { it.name }.toSet()
        val newCategories =
            names.filterNot { existingNames.contains(it) }
                .map { CategoryEntity(name = it, ownerUsername = ownerUsername) }
        if (newCategories.isNotEmpty()) {
            return existing + categoryRepository.saveAll(newCategories)
        }
        return existing
    }

    private fun resolveEntryDepth(entryId: UUID, threadId: UUID): Int {
        var depth = 1
        var currentId: UUID? = entryId
        val visited = mutableSetOf<UUID>()
        while (currentId != null) {
            if (!visited.add(currentId)) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reply chain.")
            }
            val entry = entryRepository.findById(currentId).orElseThrow {
                ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent entry not found.")
            }
            if (entry.thread?.id != threadId) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent entry mismatch.")
            }
            currentId = entry.parentEntryId
            if (currentId != null) {
                depth += 1
            }
            if (depth > 3) {
                break
            }
        }
        return depth
    }

    private fun deriveTitle(body: String): String {
        val firstLine = body.lineSequence().firstOrNull().orEmpty().trim()
        val titleSource = if (firstLine.isNotBlank()) firstLine else body.trim()
        return titleSource.take(200)
    }
}
