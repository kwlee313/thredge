package com.thredge.backend.domain.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "entries",
    indexes = [
        Index(
            name = "idx_entries_thread_created",
            columnList = "thread_id, created_at",
        ),
        Index(
            name = "idx_entries_thread_hidden_created",
            columnList = "thread_id, is_hidden, created_at",
        ),
        Index(
            name = "idx_entries_parent",
            columnList = "parent_entry_id",
        ),
    ],
)
class EntryEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", nullable = false)
    var thread: ThreadEntity? = null,

    @Column(columnDefinition = "uuid")
    var parentEntryId: UUID? = null,

    @Column(columnDefinition = "text", nullable = false)
    var body: String = "",

    @Column(nullable = false)
    var isHidden: Boolean = false,

    @Column(name = "order_index", nullable = false)
    var orderIndex: Long = 0,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun onCreate() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}
