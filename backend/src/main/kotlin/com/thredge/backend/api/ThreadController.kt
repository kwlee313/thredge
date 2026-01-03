package com.thredge.backend.api

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryRequest
import com.thredge.backend.api.dto.PageResponse
import com.thredge.backend.api.dto.ThreadCreateRequest
import com.thredge.backend.api.dto.ThreadDetail
import com.thredge.backend.api.dto.ThreadSummary
import com.thredge.backend.api.dto.ThreadUpdateRequest
import com.thredge.backend.service.ThreadService
import com.thredge.backend.support.AuthSupport
import jakarta.validation.Valid
import com.thredge.backend.support.ValidationMessages
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.Authentication
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/threads")
@Validated
class ThreadController(
    private val threadService: ThreadService,
    private val authSupport: AuthSupport,
) {
    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
        authentication: Authentication?,
    ): PageResponse<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.list(ownerUsername, PageRequest.of(page, size))
    }

    @GetMapping("/feed")
    fun feed(
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
        authentication: Authentication?,
    ): PageResponse<ThreadDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.feed(ownerUsername, PageRequest.of(page, size))
    }

    @GetMapping("/search")
    fun searchThreads(
        @RequestParam @NotBlank(message = ValidationMessages.QUERY_REQUIRED) query: String,
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
        authentication: Authentication?,
    ): PageResponse<ThreadDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.searchThreads(ownerUsername, query, PageRequest.of(page, size))
    }

    @GetMapping("/hidden")
    fun listHidden(
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
        authentication: Authentication?,
    ): PageResponse<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.listHidden(ownerUsername, PageRequest.of(page, size))
    }

    @GetMapping("/hidden/search")
    fun searchHiddenThreads(
        @RequestParam @NotBlank(message = ValidationMessages.QUERY_REQUIRED) query: String,
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
        authentication: Authentication?,
    ): PageResponse<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.searchHidden(ownerUsername, query, PageRequest.of(page, size))
    }

    @PostMapping
    fun createThread(
        @Valid @RequestBody request: ThreadCreateRequest,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.createThread(ownerUsername, request)
    }

    @GetMapping("/{id}")
    fun getThread(
        @PathVariable id: String,
        @RequestParam(required = false, defaultValue = "false") includeHidden: Boolean,
        authentication: Authentication?,
    ): ThreadDetail {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.getThread(ownerUsername, id, includeHidden)
    }

    @PatchMapping("/{id}")
    fun updateThread(
        @PathVariable id: String,
        @Valid @RequestBody request: ThreadUpdateRequest,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.updateThread(ownerUsername, id, request)
    }

    @DeleteMapping("/{id}")
    fun hideThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = authSupport.requireUsername(authentication)
        threadService.hideThread(ownerUsername, id)
        return mapOf("status" to "ok")
    }

    @PostMapping("/{id}/restore")
    fun restoreThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.restoreThread(ownerUsername, id)
    }

    @PostMapping("/{id}/pin")
    fun pinThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.pinThread(ownerUsername, id)
    }

    @PostMapping("/{id}/unpin")
    fun unpinThread(
        @PathVariable id: String,
        authentication: Authentication?,
    ): ThreadSummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.unpinThread(ownerUsername, id)
    }

    @PostMapping("/{id}/entries")
    fun addEntry(
        @PathVariable id: String,
        @Valid @RequestBody request: EntryRequest,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.addEntry(ownerUsername, id, request)
    }
}
