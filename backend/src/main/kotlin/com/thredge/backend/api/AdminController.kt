package com.thredge.backend.api

import com.thredge.backend.api.dto.AdminUserSummary
import com.thredge.backend.api.dto.SignupPolicyRequest
import com.thredge.backend.api.dto.SignupPolicyResponse
import com.thredge.backend.domain.repository.UserRepository
import com.thredge.backend.service.AppSettingService
import com.thredge.backend.support.AuthSupport
import com.thredge.backend.support.NotFoundException
import java.util.UUID
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val authSupport: AuthSupport,
    private val userRepository: UserRepository,
    private val appSettingService: AppSettingService,
) {
    @GetMapping("/users")
    fun users(authentication: Authentication?): List<AdminUserSummary> {
        authSupport.requireAdmin(authentication)
        return userRepository.findAll().map {
            val userId = it.id ?: throw IllegalStateException("User id missing")
            AdminUserSummary(
                id = userId,
                username = it.username,
                role = it.role.name,
                createdAt = it.createdAt,
            )
        }
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(
        @PathVariable id: UUID,
        authentication: Authentication?
    ): Map<String, String> {
        authSupport.requireAdmin(authentication)
        val user = userRepository.findById(id).orElseThrow { NotFoundException("User not found") }
        userRepository.delete(user)
        return mapOf("status" to "ok")
    }

    @GetMapping("/signup-policy")
    fun signupPolicy(authentication: Authentication?): SignupPolicyResponse {
        authSupport.requireAdmin(authentication)
        return SignupPolicyResponse(enabled = appSettingService.isSignupEnabled())
    }

    @PutMapping("/signup-policy")
    fun updateSignupPolicy(
        @RequestBody request: SignupPolicyRequest,
        authentication: Authentication?
    ): SignupPolicyResponse {
        authSupport.requireAdmin(authentication)
        val enabled = appSettingService.setSignupEnabled(request.enabled)
        return SignupPolicyResponse(enabled = enabled)
    }
}
