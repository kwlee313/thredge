package com.thredge.backend.api.dto

import java.time.Instant
import java.util.UUID

data class AdminUserSummary(
    val id: UUID,
    val username: String,
    val role: String,
    val createdAt: Instant,
)

data class SignupPolicyResponse(
    val enabled: Boolean,
)

data class SignupPolicyRequest(
    val enabled: Boolean,
)
