package com.thredge.backend.service

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryUpdateRequest
import com.thredge.backend.api.dto.PageResponse
import com.thredge.backend.api.mapper.ThreadMapper
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import com.thredge.backend.support.IdParser
import com.thredge.backend.support.NotFoundException
import java.time.Instant
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EntryService(
    private val entryRepository: EntryRepository,
    private val threadRepository: ThreadRepository,
    private val threadMapper: ThreadMapper,
) {
    fun listHidden(ownerUsername: String, pageable: Pageable): PageResponse<EntryDetail> {
        val page = entryRepository.findByThreadOwnerUsernameAndIsHiddenTrueOrderByCreatedAtAsc(ownerUsername, pageable)
        return PageResponse.from(page.map(threadMapper::toEntryDetail))
    }

    fun searchHidden(ownerUsername: String, query: String, pageable: Pageable): PageResponse<EntryDetail> {
        val trimmedQuery = query.trim()
        val page = entryRepository.searchHiddenEntries(ownerUsername, trimmedQuery, pageable)
        return PageResponse.from(page.map(threadMapper::toEntryDetail))
    }

    @Transactional
    fun updateEntry(ownerUsername: String, id: String, request: EntryUpdateRequest): EntryDetail {
        val entry = findEntry(id, ownerUsername)
        if (request.body != null) {
            entry.body = request.body.trim()
        }
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return threadMapper.toEntryDetail(saved)
    }

    @Transactional
    fun hideEntry(ownerUsername: String, id: String) {
        val entry = findEntry(id, ownerUsername)
        entry.isHidden = true
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
    }

    @Transactional
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
        val uuid = IdParser.parseUuid(id, "Invalid entry id.")
        val entry =
            entryRepository.findByIdAndThreadOwnerUsername(uuid, ownerUsername)
                ?: throw NotFoundException("Entry not found.")
        if (entry.isHidden && !includeHidden) {
            throw NotFoundException("Entry not found.")
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
