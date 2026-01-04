package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.CategoryEntity
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface CategoryRepository : JpaRepository<CategoryEntity, UUID> {
    fun findByOwnerIdAndNameIn(ownerId: UUID, names: Collection<String>): List<CategoryEntity>
    fun findByOwnerIdOrderByName(ownerId: UUID): List<CategoryEntity>
}
