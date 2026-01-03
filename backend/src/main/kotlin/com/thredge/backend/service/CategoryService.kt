package com.thredge.backend.service

import com.thredge.backend.api.dto.CategoryCountSummary
import com.thredge.backend.api.dto.CategoryCountsResponse
import com.thredge.backend.api.dto.CategoryRequest
import com.thredge.backend.api.dto.CategorySummary
import com.thredge.backend.api.mapper.CategoryMapper
import com.thredge.backend.domain.entity.CategoryEntity
import com.thredge.backend.domain.repository.CategoryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import com.thredge.backend.support.CategoryNameSupport
import com.thredge.backend.support.ConflictException
import com.thredge.backend.support.IdParser
import com.thredge.backend.support.NotFoundException
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class CategoryService(
        private val categoryRepository: CategoryRepository,
        private val threadRepository: ThreadRepository,
        private val categoryMapper: CategoryMapper,
) {
    fun list(ownerUsername: String): List<CategorySummary> =
            categoryRepository
                    .findByOwnerUsernameOrderByName(ownerUsername)
                    .map(categoryMapper::toSummary)

    fun counts(ownerUsername: String): CategoryCountsResponse {
        val categories = categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
        val counts =
                categories.map {
                    CategoryCountSummary(id = it.id!!.toString(), count = it.threadCount)
                }
        val uncategorizedCount = threadRepository.countUncategorizedThreads(ownerUsername)
        return CategoryCountsResponse(counts = counts, uncategorizedCount = uncategorizedCount)
    }

    fun create(ownerUsername: String, request: CategoryRequest): CategorySummary {
        val name = CategoryNameSupport.normalize(request.name)
        CategoryNameSupport.validateLength(name)
        val existing = categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
        val existingByKey = existing.associateBy { CategoryNameSupport.key(it.name) }
        val category =
                existingByKey[CategoryNameSupport.key(name)]
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
        val category =
                categoryRepository.findById(uuid).orElseThrow {
                    NotFoundException("Category not found.")
                }
        if (category.ownerUsername != ownerUsername) {
            throw NotFoundException("Category not found.")
        }
        val name = CategoryNameSupport.normalize(request.name)
        CategoryNameSupport.validateLength(name)
        val incomingKey = CategoryNameSupport.key(name)
        if (CategoryNameSupport.key(category.name) != incomingKey) {
            val existing = categoryRepository.findByOwnerUsernameOrderByName(ownerUsername)
            val conflict =
                    existing.firstOrNull {
                        it.id != category.id && CategoryNameSupport.key(it.name) == incomingKey
                    }
            if (conflict != null) {
                throw ConflictException("Category already exists.")
            }
        }
        category.name = name
        val saved = categoryRepository.save(category)
        return categoryMapper.toSummary(saved)
    }

    fun delete(ownerUsername: String, id: String) {
        val uuid = parseId(id)
        val category =
                categoryRepository.findById(uuid).orElseThrow {
                    NotFoundException("Category not found.")
                }
        if (category.ownerUsername != ownerUsername) {
            throw NotFoundException("Category not found.")
        }
        val threads = threadRepository.findAllByCategoriesIdAndOwnerUsername(uuid, ownerUsername)
        if (threads.isNotEmpty()) {
            throw ConflictException("Category has threads.")
        }
        categoryRepository.delete(category)
    }

    private fun parseId(id: String): UUID = IdParser.parseUuid(id, "Invalid category id.")
}
