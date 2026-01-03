package com.thredge.backend.service

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryUpdateRequest
import com.thredge.backend.api.mapper.ThreadMapper
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class EntryService(
    private val entryRepository: EntryRepository,
    private val threadRepository: ThreadRepository,
    private val threadMapper: ThreadMapper,
) {
    fun listHidden(ownerUsername: String): List<EntryDetail> =
        entryRepository.findByThreadOwnerUsernameAndIsHiddenTrueOrderByCreatedAtAsc(ownerUsername)
            .map(threadMapper::toEntryDetail)

    fun searchHidden(ownerUsername: String, query: String): List<EntryDetail> {
        val trimmedQuery = query.trim()
        if (trimmedQuery.isBlank()) {
            return emptyList()
        }
        return entryRepository.searchHiddenEntries(ownerUsername, trimmedQuery)
            .map(threadMapper::toEntryDetail)
    }

    fun updateEntry(ownerUsername: String, id: String, request: EntryUpdateRequest): EntryDetail {
        val entry = findEntry(id, ownerUsername)
        if (request.body != null) {
            if (request.body.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is required.")
            }
            entry.body = request.body.trim()
        }
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return threadMapper.toEntryDetail(saved)
    }

    fun hideEntry(ownerUsername: String, id: String) {
        val entry = findEntry(id, ownerUsername)
        entry.isHidden = true
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
    }

    fun restoreEntry(ownerUsername: String, id: String): EntryDetail {
        val entry = findEntry(id, ownerUsername, includeHidden = true)
        entry.isHidden = false
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return threadMapper.toEntryDetail(saved)
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
}
