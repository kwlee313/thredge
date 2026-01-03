package com.thredge.backend.api

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryRequest
import com.thredge.backend.api.dto.ThreadDetail
import com.thredge.backend.api.dto.ThreadRequest
import com.thredge.backend.api.dto.ThreadSummary
import com.thredge.backend.service.ThreadService
import com.thredge.backend.support.AuthSupport
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

@RestController
@RequestMapping("/api/threads")
class ThreadController(
    private val threadService: ThreadService,
    private val authSupport: AuthSupport,
) {
    @GetMapping
    fun list(authentication: Authentication?): List<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.list(ownerUsername)
    }

    @GetMapping("/feed")
    fun feed(authentication: Authentication?): List<ThreadDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.feed(ownerUsername)
    }

    @GetMapping("/search")
    fun searchThreads(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<ThreadDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.searchThreads(ownerUsername, query)
    }

    @GetMapping("/hidden")
    fun listHidden(authentication: Authentication?): List<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.listHidden(ownerUsername)
    }

    @GetMapping("/hidden/search")
    fun searchHiddenThreads(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<ThreadSummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.searchHidden(ownerUsername, query)
    }

    @PostMapping
    fun createThread(
        @RequestBody request: ThreadRequest,
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
        @RequestBody request: ThreadRequest,
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
        @RequestBody request: EntryRequest,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = authSupport.requireUsername(authentication)
        return threadService.addEntry(ownerUsername, id, request)
    }
}
