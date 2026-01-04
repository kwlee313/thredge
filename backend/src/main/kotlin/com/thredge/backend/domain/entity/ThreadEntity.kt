package com.thredge.backend.domain.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "threads",
    indexes = [
        Index(
            name = "idx_threads_owner_hidden_pinned_activity",
            columnList = "owner_id, is_hidden, is_pinned, last_activity_at",
        ),
        Index(
            name = "idx_threads_owner_created",
            columnList = "owner_id, created_at",
        ),
    ],
)
class ThreadEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    var id: UUID? = null,

    @Column(nullable = false, length = 200)
    var title: String = "",

    @Column(columnDefinition = "text")
    var body: String? = null,

    @Column(name = "owner_id", columnDefinition = "uuid", nullable = false)
    var ownerId: UUID? = null,


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
        joinColumns = [JoinColumn(name = "thread_id")],
        inverseJoinColumns = [JoinColumn(name = "categories_id")],
        uniqueConstraints = [UniqueConstraint(columnNames = ["thread_id", "categories_id"])],
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
