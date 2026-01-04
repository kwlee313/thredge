package com.thredge.backend.support

import com.thredge.backend.domain.repository.UserRepository
import java.util.UUID
import org.springframework.stereotype.Component

@Component
class UserSupport(
    private val userRepository: UserRepository,
) {
    fun requireUserId(username: String): UUID {
        val user = userRepository.findByUsername(username) ?: throw NotFoundException("User not found.")
        return user.id ?: throw NotFoundException("User not found.")
    }
}
