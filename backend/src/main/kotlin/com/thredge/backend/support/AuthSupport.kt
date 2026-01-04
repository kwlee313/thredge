package com.thredge.backend.support

import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component

@Component
class AuthSupport {
    fun requireUsername(authentication: Authentication?): String {
        if (authentication == null ||
            !authentication.isAuthenticated ||
            authentication is AnonymousAuthenticationToken
        ) {
            throw UnauthorizedException()
        }
        return authentication.name
    }

    fun requireAdmin(authentication: Authentication?) {
        requireUsername(authentication)
        val isAdmin =
            authentication?.authorities?.any { it.authority == "ROLE_ADMIN" } ?: false
        if (!isAdmin) {
            throw UnauthorizedException("Admin access required")
        }
    }
}
