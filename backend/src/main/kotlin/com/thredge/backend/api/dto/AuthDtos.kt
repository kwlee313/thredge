package com.thredge.backend.api.dto

import com.thredge.backend.support.ValidationMessages
import jakarta.validation.constraints.NotBlank

data class LoginRequest(
    @field:NotBlank(message = ValidationMessages.USERNAME_REQUIRED)
    val username: String = "",
    @field:NotBlank(message = ValidationMessages.PASSWORD_REQUIRED)
    val password: String = "",
)

data class SignupRequest(
    @field:NotBlank(message = ValidationMessages.USERNAME_REQUIRED)
    val username: String = "",
    @field:NotBlank(message = ValidationMessages.PASSWORD_REQUIRED)
    val password: String = "",
)

data class AuthResponse(
    val username: String,
    val role: String,
)
