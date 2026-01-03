package com.thredge.backend.domain.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "threads")
class ThreadEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    var id: UUID? = null,

    @Column(nullable = false, length = 200)
    var title: String = "",

    @Column(columnDefinition = "text")
    var body: String? = null,

    @Column(name = "owner_username", nullable = false, length = 80)
    var ownerUsername: String = "",

    @Column(nullable = false)
    var isHidden: Boolean = false,

    @Column(nullable = false)
    var isPinned: Boolean = false,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Column(nullable = false)
    var lastActivityAt: Instant = Instant.now(),
) {
    @ManyToMany
    @JoinTable(
        name = "thread_categories",
    )
    var categories: MutableSet<CategoryEntity> = mutableSetOf()

    @PrePersist
    fun onCreate() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
        if (lastActivityAt == Instant.EPOCH) {
            lastActivityAt = now
        }
    }

    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}
