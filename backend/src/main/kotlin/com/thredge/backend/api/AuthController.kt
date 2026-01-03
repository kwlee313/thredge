package com.thredge.backend.api

import com.thredge.backend.api.dto.AuthResponse
import com.thredge.backend.api.dto.LoginRequest
import com.thredge.backend.support.AuthSupport
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
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
) {
    @PostMapping("/login")
    fun login(
        @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse,
    ): AuthResponse {
        val authToken = UsernamePasswordAuthenticationToken(request.username, request.password)
        val authentication = authenticationManager.authenticate(authToken)
        val context = SecurityContextImpl(authentication)
        SecurityContextHolder.setContext(context)
        HttpSessionSecurityContextRepository().saveContext(context, httpRequest, httpResponse)
        return AuthResponse(username = authentication.name)
    }

    @GetMapping("/me")
    fun me(authentication: Authentication?): AuthResponse {
        val username = authSupport.requireUsername(authentication)
        return AuthResponse(username = username)
    }

    @PostMapping("/logout")
    fun logout(httpRequest: HttpServletRequest): Map<String, String> {
        httpRequest.session.invalidate()
        SecurityContextHolder.clearContext()
        return mapOf("status" to "ok")
    }
}
