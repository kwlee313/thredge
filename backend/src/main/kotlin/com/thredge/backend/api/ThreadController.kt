package com.thredge.backend.api

import com.thredge.backend.domain.CategoryEntity
import com.thredge.backend.domain.CategoryRepository
import com.thredge.backend.domain.EntryEntity
import com.thredge.backend.domain.EntryRepository
import com.thredge.backend.domain.ThreadEntity
import com.thredge.backend.domain.ThreadRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/threads")
class ThreadController(
    private val threadRepository: ThreadRepository,
    private val entryRepository: EntryRepository,
    private val categoryRepository: CategoryRepository,
) {
    data class ThreadSummary(
        val id: String,
        val title: String,
        val lastActivityAt: Instant,
        val categories: List<CategorySummary>,
        val pinned: Boolean,
    )

    data class ThreadDetail(
        val id: String,
        val title: String,
        val body: String?,
        val createdAt: Instant,
        val lastActivityAt: Instant,
        val categories: List<CategorySummary>,
        val pinned: Boolean,
        val entries: List<EntryDetail>,
    )

    data class CategorySummary(
        val id: String,
        val name: String,
    )

    data class EntryDetail(
        val id: String,
        val body: String,
        val parentEntryId: String?,
        val createdAt: Instant,
    )

    data class ThreadRequest(
        val title: String? = null,
        val body: String? = null,
        val categoryNames: List<String> = emptyList(),
    )

    data class EntryRequest(
        val body: String = "",
        val parentEntryId: String? = null,
    )

    @GetMapping
    fun list(authentication: Authentication?): List<ThreadSummary> {
        val ownerUsername = requireUsername(authentication)
        return threadRepository.findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
            ownerUsername,
        ).map { thread ->
                ThreadSummary(
                    id = thread.id.toString(),
                    title = thread.title,
                    lastActivityAt = thread.lastActivityAt,
                    categories = thread.categories.sortedBy { it.name }
                        .map { CategorySummary(it.id.toString(), it.name) },
                    pinned = thread.isPinned,
                )
            }
    }

    @GetMapping("/feed")
    fun feed(authentication: Authentication?): List<ThreadDetail> {
        val ownerUsername = requireUsername(authentication)
        val threads = threadRepository.findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
            ownerUsername,
        )
        return threads.map { thread ->
            val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
            ThreadDetail(
                id = thread.id.toString(),
                title = thread.title,
                body = thread.body,
                createdAt = thread.createdAt,
                lastActivityAt = thread.lastActivityAt,
                categories = thread.categories.sortedBy { it.name }
                    .map { CategorySummary(it.id.toString(), it.name) },
                pinned = thread.isPinned,
                entries =
                    entries.filter { !it.isHidden }
                        .map {
                            EntryDetail(
                                id = it.id.toString(),
                                body = it.body,
                                parentEntryId = it.parentEntryId?.toString(),
                                createdAt = it.createdAt,
                            )
                        },
            )
        }
    }

    @GetMapping("/search")
    fun searchThreads(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<ThreadDetail> {
        val ownerUsername = requireUsername(authentication)
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        val threads = threadRepository.searchVisibleThreads(ownerUsername, trimmedQuery)
        return threads.map { thread ->
            val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
            ThreadDetail(
                id = thread.id.toString(),
                title = thread.title,
                body = thread.body,
                createdAt = thread.createdAt,
                lastActivityAt = thread.lastActivityAt,
                categories = thread.categories.sortedBy { it.name }
                    .map { CategorySummary(it.id.toString(), it.name) },
                pinned = thread.isPinned,
                entries =
                    entries.filter { !it.isHidden }
                        .map {
                            EntryDetail(
                                id = it.id.toString(),
                                body = it.body,
                                parentEntryId = it.parentEntryId?.toString(),
                                createdAt = it.createdAt,
                            )
                        },
            )
        }
    }

    @GetMapping("/hidden")
    fun listHidden(authentication: Authentication?): List<ThreadSummary> {
        val ownerUsername = requireUsername(authentication)
        return threadRepository.findByOwnerUsernameAndIsHiddenTrueOrderByLastActivityAtDesc(
            ownerUsername,
        ).map { thread ->
                ThreadSummary(
                    id = thread.id.toString(),
                    title = thread.title,
                    lastActivityAt = thread.lastActivityAt,
                    categories = thread.categories.sortedBy { it.name }
                        .map { CategorySummary(it.id.toString(), it.name) },
                    pinned = thread.isPinned,
                )
            }
    }

    @GetMapping("/hidden/search")
    fun searchHiddenThreads(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<ThreadSummary> {
        val ownerUsername = requireUsername(authentication)
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        return threadRepository.searchHiddenThreads(ownerUsername, trimmedQuery).map { thread ->
            ThreadSummary(
                id = thread.id.toString(),
                title = thread.title,
                lastActivityAt = thread.lastActivityAt,
                categories = thread.categories.sortedBy { it.name }
                    .map { CategorySummary(it.id.toString(), it.name) },
                pinned = thread.isPinned,
            )
        }
    }

    @PostMapping
    fun createThread(
        @RequestBody request: ThreadRequest,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = requireUsername(authentication)
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
        return ThreadSummary(
            id = saved.id.toString(),
            title = saved.title,
            lastActivityAt = saved.lastActivityAt,
            categories = saved.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = saved.isPinned,
        )
    }

    @GetMapping("/{id}")
    fun getThread(
        @PathVariable id: String,
        @RequestParam(required = false, defaultValue = "false") includeHidden: Boolean,
        authentication: Authentication?,
    ): ThreadDetail {
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername, includeHidden = includeHidden)
        val entries = entryRepository.findByThreadIdOrderByCreatedAtAsc(thread.id!!)
        return ThreadDetail(
            id = thread.id.toString(),
            title = thread.title,
            body = thread.body,
            createdAt = thread.createdAt,
            lastActivityAt = thread.lastActivityAt,
            categories = thread.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = thread.isPinned,
            entries =
                entries.filter { !it.isHidden }
                    .map {
                        EntryDetail(
                            id = it.id.toString(),
                            body = it.body,
                            parentEntryId = it.parentEntryId?.toString(),
                            createdAt = it.createdAt,
                        )
                    },
        )
    }

    @PatchMapping("/{id}")
    fun updateThread(
        @PathVariable id: String,
        @RequestBody request: ThreadRequest,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = requireUsername(authentication)
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
        return ThreadSummary(
            id = saved.id.toString(),
            title = saved.title,
            lastActivityAt = saved.lastActivityAt,
            categories = saved.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = saved.isPinned,
        )
    }

    @DeleteMapping("/{id}")
    fun hideThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername)
        thread.isHidden = true
        threadRepository.save(thread)
        return mapOf("status" to "ok")
    }

    @PostMapping("/{id}/restore")
    fun restoreThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername, includeHidden = true)
        thread.isHidden = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return ThreadSummary(
            id = saved.id.toString(),
            title = saved.title,
            lastActivityAt = saved.lastActivityAt,
            categories = saved.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = saved.isPinned,
        )
    }

    @PostMapping("/{id}/pin")
    fun pinThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername)
        thread.isPinned = true
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return ThreadSummary(
            id = saved.id.toString(),
            title = saved.title,
            lastActivityAt = saved.lastActivityAt,
            categories = saved.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = saved.isPinned,
        )
    }

    @PostMapping("/{id}/unpin")
    fun unpinThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername)
        thread.isPinned = false
        thread.lastActivityAt = Instant.now()
        val saved = threadRepository.save(thread)
        return ThreadSummary(
            id = saved.id.toString(),
            title = saved.title,
            lastActivityAt = saved.lastActivityAt,
            categories = saved.categories.sortedBy { it.name }
                .map { CategorySummary(it.id.toString(), it.name) },
            pinned = saved.isPinned,
        )
    }

    @PostMapping("/{id}/entries")
    fun addEntry(
        @PathVariable id: String,
        @RequestBody request: EntryRequest,
        authentication: Authentication?,
    ): EntryDetail {
        if (request.body.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
        }
        val ownerUsername = requireUsername(authentication)
        val thread = findThread(id, ownerUsername)
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
        return EntryDetail(
            id = entry.id.toString(),
            body = entry.body,
            parentEntryId = entry.parentEntryId?.toString(),
            createdAt = entry.createdAt,
        )
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

    private fun requireUsername(authentication: Authentication?): String {
        if (authentication == null ||
            !authentication.isAuthenticated ||
            authentication is AnonymousAuthenticationToken
        ) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized")
        }
        return authentication.name
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
