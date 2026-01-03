package com.thredge.backend.api.mapper

import com.thredge.backend.api.dto.CategorySummary
import com.thredge.backend.domain.entity.CategoryEntity
import org.springframework.stereotype.Component

@Component
class CategoryMapper {
    fun toSummary(category: CategoryEntity): CategorySummary =
        CategorySummary(
            id = category.id.toString(),
            name = category.name,
        )
}
