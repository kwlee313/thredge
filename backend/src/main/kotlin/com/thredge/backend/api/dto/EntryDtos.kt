package com.thredge.backend.api.dto

import com.fasterxml.jackson.annotation.JsonInclude
import com.thredge.backend.support.ValidationMessages
import com.thredge.backend.support.validation.NotBlankIfPresent
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class EntryUpdateRequest(
    @field:NotBlankIfPresent(message = ValidationMessages.BODY_REQUIRED)
    val body: String? = null,
)

enum class EntryMoveDirection {
    UP,
    DOWN,
}

data class EntryMoveRequest(
    @field:jakarta.validation.constraints.NotNull
    val direction: EntryMoveDirection,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class EntryDetail(
    val id: String,
    val body: String,
    val parentEntryId: String?,
    val orderIndex: Long,
    val createdAt: Instant,
    // Thread detail responses omit this field to keep payloads small.
    val threadId: String?,
)

data class EntryRequest(
    @field:NotBlank(message = ValidationMessages.BODY_REQUIRED)
    val body: String = "",
    val parentEntryId: String? = null,
)
