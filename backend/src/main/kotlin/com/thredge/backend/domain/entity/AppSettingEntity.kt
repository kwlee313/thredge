package com.thredge.backend.domain.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "app_settings")
class AppSettingEntity(
    @Id
    @Column(length = 100)
    var key: String = "",

    @Column(nullable = false, length = 200)
    var value: String = "",

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PrePersist
    fun onCreate() {
        updatedAt = Instant.now()
    }

    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}
