package com.thredge.backend.api.dto

import java.time.Instant

data class EntryUpdateRequest(
    val body: String? = null,
)

data class EntryDetail(
    val id: String,
    val body: String,
    val parentEntryId: String?,
    val createdAt: Instant,
    val threadId: String?,
)

data class EntryRequest(
    val body: String = "",
    val parentEntryId: String? = null,
)
