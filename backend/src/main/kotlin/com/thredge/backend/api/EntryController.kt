package com.thredge.backend.api

import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/entries")
class EntryController(
    private val entryRepository: EntryRepository,
    private val threadRepository: ThreadRepository,
) {
    data class EntryUpdateRequest(
        val body: String? = null,
    )

    data class EntryDetail(
        val id: String,
        val body: String,
        val parentEntryId: String?,
        val createdAt: Instant,
        val threadId: String?,
    )

    @GetMapping("/hidden")
    fun listHidden(authentication: Authentication?): List<EntryDetail> {
        val ownerUsername = requireUsername(authentication)
        return entryRepository.findByThreadOwnerUsernameAndIsHiddenTrueOrderByCreatedAtAsc(ownerUsername)
            .map { entry ->
                EntryDetail(
                    id = entry.id.toString(),
                    body = entry.body,
                    parentEntryId = entry.parentEntryId?.toString(),
                    createdAt = entry.createdAt,
                    threadId = entry.thread?.id?.toString(),
                )
            }
    }

    @GetMapping("/hidden/search")
    fun searchHiddenEntries(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<EntryDetail> {
        val ownerUsername = requireUsername(authentication)
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        return entryRepository.searchHiddenEntries(ownerUsername, trimmedQuery)
            .map { entry ->
                EntryDetail(
                    id = entry.id.toString(),
                    body = entry.body,
                    parentEntryId = entry.parentEntryId?.toString(),
                    createdAt = entry.createdAt,
                    threadId = entry.thread?.id?.toString(),
                )
            }
    }

    @PatchMapping("/{id}")
    fun updateEntry(
        @PathVariable id: String,
        @RequestBody request: EntryUpdateRequest,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = requireUsername(authentication)
        val entry = findEntry(id, ownerUsername)
        if (request.body != null) {
            if (request.body.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
            }
            entry.body = request.body.trim()
        }
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return EntryDetail(
            id = saved.id.toString(),
            body = saved.body,
            parentEntryId = saved.parentEntryId?.toString(),
            createdAt = saved.createdAt,
            threadId = saved.thread?.id?.toString(),
        )
    }

    @DeleteMapping("/{id}")
    fun hideEntry(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = requireUsername(authentication)
        val entry = findEntry(id, ownerUsername)
        entry.isHidden = true
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return mapOf("status" to "ok")
    }

    @PatchMapping("/{id}/restore")
    fun restoreEntry(
        @PathVariable id: String,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = requireUsername(authentication)
        val entry = findEntry(id, ownerUsername, includeHidden = true)
        entry.isHidden = false
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return EntryDetail(
            id = saved.id.toString(),
            body = saved.body,
            parentEntryId = saved.parentEntryId?.toString(),
            createdAt = saved.createdAt,
            threadId = saved.thread?.id?.toString(),
        )
    }

    private fun findEntry(
        id: String,
        ownerUsername: String,
        includeHidden: Boolean = false,
    ): EntryEntity {
        val uuid =
            runCatching { UUID.fromString(id) }.getOrElse {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid entry id.")
            }
        val entry =
            entryRepository.findByIdAndThreadOwnerUsername(uuid, ownerUsername)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found.")
        if (entry.isHidden && !includeHidden) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found.")
        }
        return entry
    }

    private fun bumpThreadActivity(threadId: UUID?) {
        if (threadId == null) {
            return
        }
        val thread = threadRepository.findById(threadId).orElse(null) ?: return
        thread.lastActivityAt = Instant.now()
        threadRepository.save(thread)
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
}
