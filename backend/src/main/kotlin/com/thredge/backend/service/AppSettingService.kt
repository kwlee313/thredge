package com.thredge.backend.service

import com.thredge.backend.domain.entity.AppSettingEntity
import com.thredge.backend.domain.repository.AppSettingRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AppSettingService(
    private val appSettingRepository: AppSettingRepository,
) {
    companion object {
        const val SIGNUP_ENABLED_KEY = "signup.enabled"
    }

    @Transactional(readOnly = true)
    fun isSignupEnabled(): Boolean {
        val setting = appSettingRepository.findById(SIGNUP_ENABLED_KEY).orElse(null)
        return setting?.value?.toBooleanStrictOrNull() ?: true
    }

    @Transactional
    fun setSignupEnabled(enabled: Boolean): Boolean {
        val setting = AppSettingEntity(
            key = SIGNUP_ENABLED_KEY,
            value = enabled.toString(),
        )
        appSettingRepository.save(setting)
        return enabled
    }
}
