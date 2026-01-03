package com.thredge.backend.service

import com.thredge.backend.api.dto.CategoryRequest
import com.thredge.backend.api.dto.CategorySummary
import com.thredge.backend.api.mapper.CategoryMapper
import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.repository.CategoryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val threadRepository: ThreadRepository,
    private val categoryMapper: CategoryMapper,
) {
    fun list(ownerUsername: String): List<CategorySummary> =
        categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
            .map(categoryMapper::toSummary)

    fun create(ownerUsername: String, request: CategoryRequest): CategorySummary {
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
        return categoryMapper.toSummary(category)
    }

    fun update(ownerUsername: String, id: String, request: CategoryRequest): CategorySummary {
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
        return categoryMapper.toSummary(saved)
    }

    fun delete(ownerUsername: String, id: String) {
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
    }

    private fun parseId(id: String): UUID =
        runCatching { UUID.fromString(id) }.getOrElse {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category id.")
        }
}
