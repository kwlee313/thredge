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
import com.thredge.backend.support.UserSupport
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
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
        private val userSupport: UserSupport,
) {
    private val openEndedStartAt = Instant.EPOCH
    private val openEndedEndAt = Instant.parse("9999-12-31T23:59:59Z")
    private val emptyCategoryIdPlaceholder = UUID(0L, 0L)

    @Transactional(readOnly = true)
    fun list(ownerUsername: String, pageable: Pageable): PageResponse<ThreadSummary> {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val slice =
                threadRepository
                        .findByOwnerIdAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                                ownerId,
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
        val ownerId = userSupport.requireUserId(ownerUsername)
        val hasFilter = date != null || !categoryIds.isNullOrEmpty()
        val zone = ZoneId.systemDefault()
        val startAt =
                date?.atStartOfDay(zone)?.toInstant()
                        ?: openEndedStartAt
        val endAt =
                date?.plusDays(1)?.atStartOfDay(zone)?.toInstant()
                        ?: openEndedEndAt
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
                    val hasCategoryIds = !filteredIds.isNullOrEmpty()
                    val shouldFilterByCategory = hasCategoryIds || includeUncategorized
                    if (!shouldFilterByCategory) {
                        threadRepository.findFeedByDateRange(
                                ownerId,
                                startAt,
                                endAt,
                                pageable,
                        )
                    } else {
                        val categoryIdsForQuery =
                                filteredIds ?: listOf(emptyCategoryIdPlaceholder)
                        threadRepository.findFeedFiltered(
                                ownerId,
                                startAt,
                                endAt,
                                categoryIdsForQuery,
                                hasCategoryIds,
                                includeUncategorized,
                                pageable,
                        )
                    }
                } else {
                    threadRepository
                            .findByOwnerIdAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                                    ownerId,
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
            categoryIds: List<String>?,
            pageable: Pageable
    ): PageResponse<ThreadDetail> {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val trimmedQuery = query.trim()
        val parsedIds = categoryIds?.mapNotNull { runCatching { UUID.fromString(it) }.getOrNull() }
        val includeUncategorized = categoryIds?.any { it == "__uncategorized__" } ?: false
        val filteredIds =
                parsedIds?.filter { it.toString() != "__uncategorized__" }?.takeIf {
                    it.isNotEmpty()
                }

        val slice =
                threadRepository.searchVisibleThreads(
                        ownerId,
                        trimmedQuery,
                        filteredIds,
                        includeUncategorized,
                        pageable
                )
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
        val ownerId = userSupport.requireUserId(ownerUsername)
        val slice =
                threadRepository.findByOwnerIdAndIsHiddenTrueOrderByLastActivityAtDesc(
                        ownerId,
                        pageable
                )
        return PageResponse.from(slice.map(threadMapper::toThreadSummary))
    }

    @Transactional(readOnly = true)
    fun searchHidden(
            ownerUsername: String,
            query: String,
            categoryIds: List<String>?,
            pageable: Pageable
    ): PageResponse<ThreadSummary> {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val trimmedQuery = query.trim()
        val parsedIds = categoryIds?.mapNotNull { runCatching { UUID.fromString(it) }.getOrNull() }
        val includeUncategorized = categoryIds?.any { it == "__uncategorized__" } ?: false
        val filteredIds =
                parsedIds?.filter { it.toString() != "__uncategorized__" }?.takeIf {
                    it.isNotEmpty()
                }

        val slice =
                threadRepository.searchHiddenThreads(
                        ownerId,
                        trimmedQuery,
                        filteredIds,
                        includeUncategorized,
                        pageable
                )
        return PageResponse.from(slice.map(threadMapper::toThreadSummary))
    }

    fun createThread(ownerUsername: String, request: ThreadCreateRequest): ThreadSummary {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val body = request.body.trim()
        val title = deriveTitle(body)
        val categories = resolveCategories(request.categoryNames, ownerId)
        val thread =
                ThreadEntity(
                                title = title,
                                body = body,
                                ownerId = ownerId,
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
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId, includeHidden = includeHidden)
        return buildThreadDetail(thread)
    }

    @Transactional
    fun updateThread(
            ownerUsername: String,
            id: String,
            request: ThreadUpdateRequest
    ): ThreadSummary {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId)
        val newBody = request.body?.trim()
        if (newBody != null) {
            thread.body = newBody
            thread.title = deriveTitle(newBody)
        } else if (!request.title.isNullOrBlank()) {
            thread.title = request.title.trim()
        }

        request.categoryNames?.let { names ->
            val oldCategories = thread.categories.toList()
            val newCategories = resolveCategories(names, ownerId)

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
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId)
        thread.isHidden = true
        threadRepository.save(thread)

        thread.categories.forEach {
            it.threadCount -= 1
            categoryRepository.save(it)
        }
    }

    @Transactional
    fun restoreThread(ownerUsername: String, id: String): ThreadSummary {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId, includeHidden = true)
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
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId)
        thread.isPinned = true
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun unpinThread(ownerUsername: String, id: String): ThreadSummary {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(id, ownerId)
        thread.isPinned = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return threadMapper.toThreadSummary(saved)
    }

    @Transactional
    fun addEntry(ownerUsername: String, threadId: String, request: EntryRequest): EntryDetail {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val thread = findThread(threadId, ownerId)
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
        val maxOrderIndex =
                entryRepository.findMaxOrderIndex(thread.id!!, parentEntryId) ?: 0L
        val entry =
                entryRepository.save(
                        EntryEntity(
                                thread = thread,
                                body = request.body.trim(),
                                parentEntryId = parentEntryId,
                                orderIndex = maxOrderIndex + 1000L,
                        ),
                )
        thread.lastActivityAt = Instant.now()
        threadRepository.save(thread)
        return threadMapper.toEntryDetail(entry, null)
    }

    private fun findThread(
            id: String,
            ownerId: UUID,
            includeHidden: Boolean = false,
    ): ThreadEntity {
        val uuid = IdParser.parseUuid(id, "Invalid thread id.")
        val thread =
                threadRepository.findByIdAndOwnerId(uuid, ownerId)
                        ?: throw NotFoundException("Thread not found.")
        if (thread.isHidden && !includeHidden) {
            throw NotFoundException("Thread not found.")
        }
        return thread
    }

    private fun resolveCategories(
            rawNames: List<String>,
            ownerId: UUID,
    ): List<CategoryEntity> {
        val names =
                CategoryNameSupport.normalizeAll(rawNames).distinctBy {
                    CategoryNameSupport.key(it)
                }
        if (names.isEmpty()) {
            return emptyList()
        }
        names.forEach(CategoryNameSupport::validateLength)
        val existing = categoryRepository.findByOwnerIdOrderByName(ownerId)
        val existingByKey = existing.associateBy { CategoryNameSupport.key(it.name) }
        val resolved = mutableListOf<CategoryEntity>()
        val toCreate = mutableListOf<CategoryEntity>()
        names.forEach { name ->
            val key = CategoryNameSupport.key(name)
            val matched = existingByKey[key]
            if (matched != null) {
                resolved.add(matched)
            } else {
                val entity = CategoryEntity(
                        name = name,
                        ownerId = ownerId,
                )
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
        val entries = entryRepository.findByThreadIdOrderByOrderIndexAsc(thread.id!!)
        return threadMapper.toThreadDetail(thread, entries)
    }

    private fun buildThreadDetails(threads: List<ThreadEntity>): List<ThreadDetail> {
        if (threads.isEmpty()) {
            return emptyList()
        }
        val threadIds = threads.mapNotNull { it.id }
        val entries = entryRepository.findByThreadIdInOrderByOrderIndexAsc(threadIds)
        val groupedEntries = entries.groupBy { it.thread?.id }
        return threads.map { thread ->
            val threadEntries = groupedEntries[thread.id].orEmpty()
            threadMapper.toThreadDetail(thread, threadEntries)
        }
    }
}
