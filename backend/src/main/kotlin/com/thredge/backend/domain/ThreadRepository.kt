package com.thredge.backend.domain

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ThreadRepository : JpaRepository<ThreadEntity, UUID> {
    fun findByOwnerUsernameAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
        ownerUsername: String,
    ): List<ThreadEntity>
    fun findByOwnerUsernameAndIsHiddenTrueOrderByLastActivityAtDesc(
        ownerUsername: String,
    ): List<ThreadEntity>
    fun findAllByCategoriesIdAndOwnerUsername(categoryId: UUID, ownerUsername: String): List<ThreadEntity>
    fun findByIdAndOwnerUsername(id: UUID, ownerUsername: String): ThreadEntity?

    @Query(
        """
        select distinct t from ThreadEntity t
        left join EntryEntity e on e.thread = t
        where t.ownerUsername = :ownerUsername
          and t.isHidden = false
          and (
            lower(t.title) like lower(concat('%', :query, '%')) or
            lower(coalesce(t.body, '')) like lower(concat('%', :query, '%')) or
            (e.isHidden = false and lower(e.body) like lower(concat('%', :query, '%')))
          )
        order by t.isPinned desc, t.lastActivityAt desc
        """,
    )
    fun searchVisibleThreads(
        @Param("ownerUsername") ownerUsername: String,
        @Param("query") query: String,
    ): List<ThreadEntity>

    @Query(
        """
        select distinct t from ThreadEntity t
        left join EntryEntity e on e.thread = t
        where t.ownerUsername = :ownerUsername
          and t.isHidden = true
          and (
            lower(t.title) like lower(concat('%', :query, '%')) or
            lower(coalesce(t.body, '')) like lower(concat('%', :query, '%')) or
            lower(coalesce(e.body, '')) like lower(concat('%', :query, '%'))
          )
        order by t.isPinned desc, t.lastActivityAt desc
        """,
    )
    fun searchHiddenThreads(
        @Param("ownerUsername") ownerUsername: String,
        @Param("query") query: String,
    ): List<ThreadEntity>
}
