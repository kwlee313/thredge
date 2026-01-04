package com.thredge.backend.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig(
    @Value("\${app.cors.allowed-origins}")
    private val allowedOrigins: String,
) : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        val origins = allowedOrigins
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toTypedArray()

        registry.addMapping("/**")
            .allowedOrigins(*origins)
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowCredentials(true)
    }
}
