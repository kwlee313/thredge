package com.thredge.backend.api

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryUpdateRequest
import com.thredge.backend.service.EntryService
import com.thredge.backend.support.AuthSupport
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/entries")
class EntryController(
    private val entryService: EntryService,
    private val authSupport: AuthSupport,
) {
    @GetMapping("/hidden")
    fun listHidden(authentication: Authentication?): List<EntryDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.listHidden(ownerUsername)
    }

    @GetMapping("/hidden/search")
    fun searchHiddenEntries(
        @RequestParam query: String,
        authentication: Authentication?,
    ): List<EntryDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.searchHidden(ownerUsername, query)
    }

    @PatchMapping("/{id}")
    fun updateEntry(
        @PathVariable id: String,
        @RequestBody request: EntryUpdateRequest,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.updateEntry(ownerUsername, id, request)
    }

    @DeleteMapping("/{id}")
    fun hideEntry(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = authSupport.requireUsername(authentication)
        entryService.hideEntry(ownerUsername, id)
        return mapOf("status" to "ok")
    }

    @PatchMapping("/{id}/restore")
    fun restoreEntry(
        @PathVariable id: String,
        authentication: Authentication?,
    ): EntryDetail {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.restoreEntry(ownerUsername, id)
    }
}
