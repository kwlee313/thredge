package com.thredge.backend.api

import com.thredge.backend.api.dto.CategoryRequest
import com.thredge.backend.api.dto.CategorySummary
import com.thredge.backend.service.CategoryService
import com.thredge.backend.support.AuthSupport
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/categories")
class CategoryController(
    private val categoryService: CategoryService,
    private val authSupport: AuthSupport,
) {
    @GetMapping
    fun list(authentication: Authentication?): List<CategorySummary> {
        val ownerUsername = authSupport.requireUsername(authentication)
        return categoryService.list(ownerUsername)
    }

    @PostMapping
    fun create(
        @RequestBody request: CategoryRequest,
        authentication: Authentication?,
    ): CategorySummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return categoryService.create(ownerUsername, request)
    }

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody request: CategoryRequest,
        authentication: Authentication?,
    ): CategorySummary {
        val ownerUsername = authSupport.requireUsername(authentication)
        return categoryService.update(ownerUsername, id, request)
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = authSupport.requireUsername(authentication)
        categoryService.delete(ownerUsername, id)
        return mapOf("status" to "ok")
    }
}
