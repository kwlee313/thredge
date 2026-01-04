package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.AppSettingEntity
import org.springframework.data.jpa.repository.JpaRepository

interface AppSettingRepository : JpaRepository<AppSettingEntity, String>
