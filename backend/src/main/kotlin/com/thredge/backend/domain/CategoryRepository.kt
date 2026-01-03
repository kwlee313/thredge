package com.thredge.backend.domain

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface CategoryRepository : JpaRepository<CategoryEntity, UUID> {
    fun findByOwnerUsernameAndNameIn(ownerUsername: String, names: Collection<String>): List<CategoryEntity>
    fun findByOwnerUsernameOrderByName(ownerUsername: String): List<CategoryEntity>
}
