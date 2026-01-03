package com.thredge.backend.domain.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.util.UUID

@Entity
@Table(
        name = "categories",
        uniqueConstraints =
                [
                        UniqueConstraint(columnNames = ["owner_username", "name"]),
                ],
)
class CategoryEntity(
        @field:Id
        @field:GeneratedValue(strategy = GenerationType.UUID)
        @field:Column(columnDefinition = "uuid")
        var id: UUID? = null,
        @field:Column(nullable = false, length = 80) var name: String = "",
        @field:Column(name = "owner_username", nullable = false, length = 80)
        var ownerUsername: String = "",
        @field:Column(name = "thread_count", nullable = false) var threadCount: Long = 0,
)
