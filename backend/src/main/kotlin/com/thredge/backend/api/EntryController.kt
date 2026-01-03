package com.thredge.backend.api

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.PageResponse
import com.thredge.backend.api.dto.EntryUpdateRequest
import com.thredge.backend.service.EntryService
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
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/entries")
@Validated
class EntryController(
    private val entryService: EntryService,
    private val authSupport: AuthSupport,
) {
    @GetMapping("/hidden")
    fun listHidden(
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "50") @Min(1) @Max(200) size: Int,
        authentication: Authentication?,
    ): PageResponse<EntryDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.listHidden(ownerUsername, PageRequest.of(page, size))
    }

    @GetMapping("/hidden/search")
    fun searchHiddenEntries(
        @RequestParam @NotBlank(message = ValidationMessages.QUERY_REQUIRED) query: String,
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "50") @Min(1) @Max(200) size: Int,
        authentication: Authentication?,
    ): PageResponse<EntryDetail> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return entryService.searchHidden(ownerUsername, query, PageRequest.of(page, size))
    }

    @PatchMapping("/{id}")
    fun updateEntry(
        @PathVariable id: String,
        @Valid @RequestBody request: EntryUpdateRequest,
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
