package com.thredge.backend.support

import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus

@Component
class AuthSupport {
    fun requireUsername(authentication: Authentication?): String {
        if (authentication == null ||
            !authentication.isAuthenticated ||
            authentication is AnonymousAuthenticationToken
        ) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized")
        }
        return authentication.name
    }
}
