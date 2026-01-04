package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.UserEntity
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByUsername(username: String): UserEntity?

    fun existsByUsername(username: String): Boolean
}
