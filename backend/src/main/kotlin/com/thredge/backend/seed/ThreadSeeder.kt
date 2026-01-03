package com.thredge.backend.seed

import com.thredge.backend.domain.entity.ThreadEntity
import com.thredge.backend.domain.repository.ThreadRepository
import java.time.Instant
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component

@Component
@Profile("local")
class ThreadSeeder(
    private val threadRepository: ThreadRepository,
) : CommandLineRunner {
    override fun run(vararg args: String) {
        if (threadRepository.count() > 0) {
            return
        }

        val now = Instant.now()
        threadRepository.saveAll(
            listOf(
                ThreadEntity(
                    title = "AI request flow notes",
                    body = "Outline the request mode switch and scope selector UX.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 24),
                ),
                ThreadEntity(
                    title = "Thread and entry UX",
                    body = "Keep entries chronological and hide edit controls.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 48),
                ),
                ThreadEntity(
                    title = "Hide policy scenarios",
                    body = "Use hide instead of delete to preserve context.",
                    lastActivityAt = now.minusSeconds(60 * 60 * 72),
                ),
            ),
        )
    }
}
