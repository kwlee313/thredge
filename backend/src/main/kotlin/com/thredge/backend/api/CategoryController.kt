package com.thredge.backend.api

import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.repository.CategoryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.security.core.Authentication
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/categories")
class CategoryController(
    private val categoryRepository: CategoryRepository,
    private val threadRepository: ThreadRepository,
) {
    data class CategorySummary(
        val id: String,
        val name: String,
    )

    data class CategoryRequest(
        val name: String = "",
    )

    @GetMapping
    fun list(authentication: Authentication?): List<CategorySummary> {
        val ownerUsername = requireUsername(authentication)
        return categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
            .map { CategorySummary(it.id.toString(), it.name) }
    }

    @PostMapping
    fun create(
        @RequestBody request: CategoryRequest,
        authentication: Authentication?,
    ): CategorySummary {
        val ownerUsername = requireUsername(authentication)
        val name = request.name.trim()
        if (name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required.")
        }
        val existing = categoryRepository.findByOwnerUsernameAndNameIn(ownerUsername, listOf(name))
        val category =
            existing.firstOrNull()
                ?: categoryRepository.save(
                    CategoryEntity(
                        name = name,
                        ownerUsername = ownerUsername,
                    ),
                )
        return CategorySummary(category.id.toString(), category.name)
    }

    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody request: CategoryRequest,
        authentication: Authentication?,
    ): CategorySummary {
        val ownerUsername = requireUsername(authentication)
        val uuid = parseId(id)
        val category = categoryRepository.findById(uuid).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found.")
        }
        if (category.ownerUsername != ownerUsername) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found.")
        }
        val name = request.name.trim()
        if (name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required.")
        }
        if (category.name != name) {
            val exists = categoryRepository.findByOwnerUsernameAndNameIn(ownerUsername, listOf(name))
            if (exists.isNotEmpty()) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Category already exists.")
            }
        }
        category.name = name
        val saved = categoryRepository.save(category)
        return CategorySummary(saved.id.toString(), saved.name)
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: String,
        authentication: Authentication?,
    ): Map<String, String> {
        val ownerUsername = requireUsername(authentication)
        val uuid = parseId(id)
        val category = categoryRepository.findById(uuid).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found.")
        }
        if (category.ownerUsername != ownerUsername) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found.")
        }
        val threads = threadRepository.findAllByCategoriesIdAndOwnerUsername(uuid, ownerUsername)
        if (threads.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Category has threads.")
        }
        categoryRepository.delete(category)
        return mapOf("status" to "ok")
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

    private fun parseId(id: String): UUID =
        runCatching { UUID.fromString(id) }.getOrElse {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category id.")
        }
}
