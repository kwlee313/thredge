package com.thredge.backend.config

import com.thredge.backend.domain.entity.UserEntity
import com.thredge.backend.domain.entity.UserRole
import com.thredge.backend.domain.repository.UserRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
class DataInitializer(
        private val userRepository: UserRepository,
        private val passwordEncoder: PasswordEncoder
) : CommandLineRunner {

    override fun run(vararg args: String) {
        if (userRepository.count() == 0L) {
            val adminUser =
                    UserEntity(
                            username = "admin",
                            passwordHash = requireNotNull(passwordEncoder.encode("admin")),
                            role = UserRole.ADMIN
                    )
            val defaultUser =
                    UserEntity(
                            username = "user",
                            passwordHash = requireNotNull(passwordEncoder.encode("user")),
                            role = UserRole.USER
                    )
            userRepository.saveAll(listOf(adminUser, defaultUser))
        }
    }
}
