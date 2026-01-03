package com.thredge.backend.service

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryRequest
import com.thredge.backend.api.dto.PageResponse
import com.thredge.backend.api.dto.ThreadCreateRequest
import com.thredge.backend.api.dto.ThreadDetail
import com.thredge.backend.api.dto.ThreadSummary
import com.thredge.backend.api.dto.ThreadUpdateRequest
import com.thredge.backend.api.mapper.ThreadMapper
import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.entity.ThreadEntity
import com.thredge.backend.domain.repository.CategoryRepository
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import com.thredge.backend.support.BadRequestException
import com.thredge.backend.support.CategoryNameSupport
import com.thredge.backend.support.IdParser
import com.thredge.backend.support.NotFoundException
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ThreadService(
        private val threadRepository: ThreadRepository,
        private val entryRepository: EntryRepository,
        private val categoryRepository: CategoryRepository,
        private val threadMapper: ThreadMapper,
) {
    @Transactional(readOnly = true)
    fun list(ownerUsername: String, pageable: Pageable): PageResponse<ThreadSummary> {
        val slice =
                threadRepository
                        .findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                                ownerUsername,
                                pageable,
                        )
        return PageResponse.from(slice.map(threadMapper::toThreadSummary))
    }

    @Transactional(readOnly = true)
    fun feed(
            ownerUsername: String,
            pageable: Pageable,
            date: LocalDate? = null,
            categoryIds: List<String>? = null,
    ): PageResponse<ThreadDetail> {
        val hasFilter = date != null || !categoryIds.isNullOrEmpty()
        val slice =
                if (hasFilter) {
                    val parsedIds =
                            categoryIds?.mapNotNull {
                                runCatching { UUID.fromString(it) }.getOrNull()
                            }
                    val includeUncategorized =
                            categoryIds?.any { it == "__uncategorized__" } ?: false
                    val filteredIds =
                            parsedIds?.filter { it.toString() != "__uncategorized__" }?.takeIf {
                                it.isNotEmpty()
                            }
                    threadRepository.findFeedFiltered(
                            ownerUsername,
                            date,
                            filteredIds,
                            includeUncategorized,
                            pageable,
                    )
                } else {
                    threadRepository
                            .findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                                    ownerUsername,
                                    pageable,
                            )
                }
        val details = buildThreadDetails(slice.content)
        return PageResponse(
                items = details,
                page = slice.number,
                size = slice.size,
                hasNext = slice.hasNext(),
        )
    }

    @Transactional(readOnly = true)
    fun searchThreads(
            ownerUsername: String,
            query: String,
            pageable: Pageable
    ): PageResponse<ThreadDetail> {
        val trimmedQuery = query.trim()
        val slice = threadRepository.searchVisibleThreads(ownerUsername, trimmedQuery, pageable)
        val details = buildThreadDetails(slice.content)
        return PageResponse(
                items = details,
                page = slice.number,
                size = slice.size,
                hasNext = slice.hasNext(),
        )
    }

    @Transactional(readOnly = true)
    fun listHidden(ownerUsername: String, pageable: Pageable): PageResponse<ThreadSummary> {
        val slice =
                threadRepository.findByOwnerUsernameAndIsHiddenTrueOrderByLastActivityAtDesc(
                        ownerUsername,
                        pageable
                )
        return PageResponse.from(slice.map(threadMapper::toThreadSummary))
    }

    @Transactional(readOnly = true)
    fun searchHidden(
            ownerUsername: String,
            query: String,
            pageable: Pageable
    ): PageResponse<ThreadSummary> {
        val trimmedQuery = query.trim()
        val slice = threadRepository.searchHiddenThreads(ownerUsername, trimmedQuery, pageable)
        return PageResponse.from(slice.map(threadMapper::toThreadSummary))
    }

    fun createThread(ownerUsername: String, request: ThreadCreateRequest): ThreadSummary {
        val body = request.body.trim()
        val title = deriveTitle(body)
        val categories = resolveCategories(request.categoryNames, ownerUsername)
        val thread =
                ThreadEntity(
                                title = title,
                                body = body,
                                ownerUsername = ownerUsername,
                        )
                        .apply { this.categories = categories.toMutableSet() }
        val saved = threadRepository.save(thread)

        categories.forEach {
            it.threadCount += 1
            categoryRepository.save(it)
        }

        return threadMapper.toThreadSummary(saved)
    }

    @Transactional(readOnly = true)
    fun getThread(ownerUsername: String, id: String, includeHidden: Boolean): ThreadDetail {
        val thread = findThread(id, ownerUsername, includeHidden = includeHidden)
        return buildThreadDetail(thread)
    }

    @Transactional
    fun updateThread(
            ownerUsername: String,
            id: String,
            request: ThreadUpdateRequest
    ): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        val newBody = request.body?.trim()
        if (newBody != null) {
            thread.body = newBody
            thread.title = deriveTitle(newBody)
        } else if (!request.title.isNullOrBlank()) {
            thread.title = request.title.trim()
        }

        request.categoryNames?.let { names ->
            val oldCategories = thread.categories.toList()
            val newCategories = resolveCategories(names, ownerUsername)

            val oldIds = oldCategories.map { it.id }.toSet()
            val newIds = newCategories.map { it.id }.toSet()

            // Decrement counts for removed categories
            oldCategories.filter { it.id !in newIds }.forEach {
                it.threadCount -= 1
                categoryRepository.save(it)
            }

            // Increment counts for added categories
            newCategories.filter { it.id !in oldIds }.forEach {
                it.threadCount += 1
                categoryRepository.save(it)
            }

            thread.categories = newCategories.toMutableSet()
        }

        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun hideThread(ownerUsername: String, id: String) {
        val thread = findThread(id, ownerUsername)
        thread.isHidden = true
        threadRepository.save(thread)

        thread.categories.forEach {
            it.threadCount -= 1
            categoryRepository.save(it)
        }
    }

    @Transactional
    fun restoreThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername, includeHidden = true)
        if (!thread.isHidden) {
            return threadMapper.toThreadSummary(thread)
        }
        thread.isHidden = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)

        thread.categories.forEach {
            it.threadCount += 1
            categoryRepository.save(it)
        }

        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun pinThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        thread.isPinned = true
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun unpinThread(ownerUsername: String, id: String): ThreadSummary {
        val thread = findThread(id, ownerUsername)
        thread.isPinned = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun addEntry(ownerUsername: String, threadId: String, request: EntryRequest): EntryDetail {
        val thread = findThread(threadId, ownerUsername)
        val parentEntryId =
                request.parentEntryId?.let {
                    runCatching { UUID.fromString(it) }.getOrElse {
                        throw BadRequestException("Invalid parent entry id.")
                    }
                }
        val parentDepth = parentEntryId?.let { resolveEntryDepth(it, thread.id!!) } ?: 0
        if (parentDepth >= 3) {
            throw BadRequestException("Reply depth limit reached.")
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
        return threadMapper.toEntryDetail(entry, null)
    }

    private fun findThread(
            id: String,
            ownerUsername: String,
            includeHidden: Boolean = false,
    ): ThreadEntity {
        val uuid = IdParser.parseUuid(id, "Invalid thread id.")
        val thread =
                threadRepository.findByIdAndOwnerUsername(uuid, ownerUsername)
                        ?: throw NotFoundException("Thread not found.")
        if (thread.isHidden && !includeHidden) {
            throw NotFoundException("Thread not found.")
        }
        return thread
    }

    private fun resolveCategories(
            rawNames: List<String>,
            ownerUsername: String,
    ): List<CategoryEntity> {
        val names =
                CategoryNameSupport.normalizeAll(rawNames).distinctBy {
                    CategoryNameSupport.key(it)
                }
        if (names.isEmpty()) {
            return emptyList()
        }
        names.forEach(CategoryNameSupport::validateLength)
        val existing = categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
        val existingByKey = existing.associateBy { CategoryNameSupport.key(it.name) }
        val resolved = mutableListOf<CategoryEntity>()
        val toCreate = mutableListOf<CategoryEntity>()
        names.forEach { name ->
            val key = CategoryNameSupport.key(name)
            val matched = existingByKey[key]
            if (matched != null) {
                resolved.add(matched)
            } else {
                val entity = CategoryEntity(name = name, ownerUsername = ownerUsername)
                toCreate.add(entity)
                resolved.add(entity)
            }
        }
        if (toCreate.isEmpty()) {
            return resolved
        }
        val saved = categoryRepository.saveAll(toCreate)
        val savedByKey = saved.associateBy { CategoryNameSupport.key(it.name) }
        return resolved.map { category ->
            if (category.id != null) {
                category
            } else {
                savedByKey[CategoryNameSupport.key(category.name)] ?: category
            }
        }
    }

    private fun resolveEntryDepth(entryId: UUID, threadId: UUID): Int {
        var depth = 1
        var currentId: UUID? = entryId
        val visited = mutableSetOf<UUID>()
        while (currentId != null) {
            if (!visited.add(currentId)) {
                throw BadRequestException("Invalid reply chain.")
            }
            val entry =
                    entryRepository.findById(currentId).orElseThrow {
                        BadRequestException("Parent entry not found.")
                    }
            if (entry.thread?.id != threadId) {
                throw BadRequestException("Parent entry mismatch.")
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

    private fun buildThreadDetail(thread: ThreadEntity): ThreadDetail {
        val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
        return threadMapper.toThreadDetail(thread, entries)
    }

    private fun buildThreadDetails(threads: List<ThreadEntity>): List<ThreadDetail> {
        if (threads.isEmpty()) {
            return emptyList()
        }
        val threadIds = threads.mapNotNull { it.id }
        val entries = entryRepository.findByThreadIdInOrderByCreatedAtAsc(threadIds)
        val groupedEntries = entries.groupBy { it.thread?.id }
        return threads.map { thread ->
            val threadEntries = groupedEntries[thread.id].orEmpty()
            threadMapper.toThreadDetail(thread, threadEntries)
        }
    }
}
