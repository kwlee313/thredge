package com.thredge.backend.seed

import com.thredge.backend.domain.entity.ThreadEntity
import com.thredge.backend.domain.entity.UserEntity
import com.thredge.backend.domain.repository.ThreadRepository
import com.thredge.backend.domain.repository.UserRepository
import java.time.Instant
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
@Profile("local")
class ThreadSeeder(
    private val threadRepository: ThreadRepository,
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) : CommandLineRunner {
    override fun run(vararg args: String) {
        if (threadRepository.count() > 0) {
            return
        }

        val user = userRepository.findByUsername("local")
            ?: userRepository.save(
                UserEntity(
                    username = "local",
                    passwordHash = requireNotNull(passwordEncoder.encode("local1234")),
                ),
            )

        val now = Instant.now()
        threadRepository.saveAll(
            listOf(
                ThreadEntity(
                    title = "AI request flow notes",
                    body = "Outline the request mode switch and scope selector UX.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 24),
                    ownerId = user.id,
                ),
                ThreadEntity(
                    title = "Thread and entry UX",
                    body = "Keep entries chronological and hide edit controls.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 48),
                    ownerId = user.id,
                ),
                ThreadEntity(
                    title = "Hide policy scenarios",
                    body = "Use hide instead of delete to preserve context.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 72),
                    ownerId = user.id,
                ),
            ),
        )
    }
}
