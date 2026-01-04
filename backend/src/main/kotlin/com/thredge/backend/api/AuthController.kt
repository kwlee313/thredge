package com.thredge.backend.api

import com.thredge.backend.api.dto.AuthResponse
import com.thredge.backend.api.dto.LoginRequest
import com.thredge.backend.api.dto.PasswordChangeRequest
import com.thredge.backend.api.dto.SignupRequest
import com.thredge.backend.domain.entity.UserEntity
import com.thredge.backend.domain.repository.UserRepository
import com.thredge.backend.service.AppSettingService
import com.thredge.backend.support.AuthSupport
import com.thredge.backend.support.BadRequestException
import com.thredge.backend.support.ConflictException
import com.thredge.backend.support.NotFoundException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
        private val authenticationManager: AuthenticationManager,
        private val authSupport: AuthSupport,
        private val userRepository: UserRepository,
        private val passwordEncoder: PasswordEncoder,
        private val appSettingService: AppSettingService,
) {
    @PostMapping("/login")
    fun login(
            @Valid @RequestBody request: LoginRequest,
            httpRequest: HttpServletRequest,
            httpResponse: HttpServletResponse,
    ): AuthResponse {
        val authentication = authenticate(request.username, request.password, httpRequest, httpResponse)
        return buildAuthResponse(authentication.name)
    }

    @PostMapping("/signup")
    fun signup(
            @Valid @RequestBody request: SignupRequest,
            httpRequest: HttpServletRequest,
            httpResponse: HttpServletResponse,
    ): AuthResponse {
        if (!appSettingService.isSignupEnabled()) {
            throw BadRequestException("Signup is disabled.")
        }
        if (userRepository.existsByUsername(request.username)) {
            throw ConflictException("Username already exists.")
        }

        val rawPassword = requireNotNull(request.password)
        val encodedPassword = requireNotNull(passwordEncoder.encode(rawPassword))
        val user =
                UserEntity(
                        username = request.username,
                        passwordHash = encodedPassword
                )
        userRepository.save(user)

        val authentication = authenticate(request.username, rawPassword, httpRequest, httpResponse)
        return buildAuthResponse(authentication.name)
    }

    @GetMapping("/me")
    fun me(authentication: Authentication?): AuthResponse {
        val username = authSupport.requireUsername(authentication)
        return buildAuthResponse(username)
    }

    @PostMapping("/password")
    fun changePassword(
            @Valid @RequestBody request: PasswordChangeRequest,
            authentication: Authentication?
    ): Map<String, String> {
        val username = authSupport.requireUsername(authentication)
        val user =
                userRepository.findByUsername(username)
                        ?: throw IllegalArgumentException("User not found")

        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) {
            throw IllegalArgumentException("Invalid current password")
        }

        val newPassword = requireNotNull(request.newPassword)
        user.passwordHash = requireNotNull(passwordEncoder.encode(newPassword))
        userRepository.save(user)

        return mapOf("status" to "ok")
    }

    @PostMapping("/logout")
    fun logout(httpRequest: HttpServletRequest): Map<String, String> {
        httpRequest.session.invalidate()
        SecurityContextHolder.clearContext()
        return mapOf("status" to "ok")
    }

    private fun authenticate(
            username: String,
            password: String,
            httpRequest: HttpServletRequest,
            httpResponse: HttpServletResponse,
    ): Authentication {
        val authToken = UsernamePasswordAuthenticationToken(username, password)
        val authentication = authenticationManager.authenticate(authToken)
        val context = SecurityContextImpl(authentication)
        SecurityContextHolder.setContext(context)
        HttpSessionSecurityContextRepository().saveContext(context, httpRequest, httpResponse)
        return authentication
    }

    private fun buildAuthResponse(username: String): AuthResponse {
        val user =
                userRepository.findByUsername(username)
                        ?: throw NotFoundException("User not found")
        return AuthResponse(username = user.username, role = user.role.name)
    }
}
