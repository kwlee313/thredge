package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.ThreadEntity
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Slice
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ThreadRepository : JpaRepository<ThreadEntity, UUID> {
        fun findByOwnerIdAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                ownerId: UUID,
        ): List<ThreadEntity>
        fun findByOwnerIdAndIsHiddenFalseOrderByIsPinnedDescLastActivityAtDesc(
                ownerId: UUID,
                pageable: Pageable,
        ): Slice<ThreadEntity>

        @Query(
                """
        select distinct t from ThreadEntity t
        left join t.categories c
        where t.ownerId = :ownerId
          and t.isHidden = false
          and t.createdAt >= :startAt
          and t.createdAt < :endAt
          and (
            (:hasCategoryIds = true and c.id in :categoryIds)
            or (:includeUncategorized = true and t.categories is empty)
          )
        order by t.isPinned desc, t.lastActivityAt desc
        """,
        )
        fun findFeedFiltered(
                @Param("ownerId") ownerId: UUID,
                @Param("startAt") startAt: java.time.Instant,
                @Param("endAt") endAt: java.time.Instant,
                @Param("categoryIds") categoryIds: List<java.util.UUID>?,
                @Param("hasCategoryIds") hasCategoryIds: Boolean,
                @Param("includeUncategorized") includeUncategorized: Boolean,
                pageable: Pageable,
        ): Slice<ThreadEntity>

        @Query(
                """
        select distinct t from ThreadEntity t
        where t.ownerId = :ownerId
          and t.isHidden = false
          and t.createdAt >= :startAt
          and t.createdAt < :endAt
        order by t.isPinned desc, t.lastActivityAt desc
        """,
        )
        fun findFeedByDateRange(
                @Param("ownerId") ownerId: UUID,
                @Param("startAt") startAt: java.time.Instant,
                @Param("endAt") endAt: java.time.Instant,
                pageable: Pageable,
        ): Slice<ThreadEntity>
        fun findByOwnerIdAndIsHiddenTrueOrderByLastActivityAtDesc(
                ownerId: UUID,
        ): List<ThreadEntity>
        fun findByOwnerIdAndIsHiddenTrueOrderByLastActivityAtDesc(
                ownerId: UUID,
                pageable: Pageable,
        ): Slice<ThreadEntity>
        fun findAllByCategoriesIdAndOwnerId(
                categoryId: UUID,
                ownerId: UUID
        ): List<ThreadEntity>
        fun findAllByCategoriesIdAndOwnerIdAndIsHiddenFalse(
                categoryId: UUID,
                ownerId: UUID
        ): List<ThreadEntity>
        fun findAllByCategoriesIdAndOwnerIdAndIsHiddenTrue(
                categoryId: UUID,
                ownerId: UUID
        ): List<ThreadEntity>
        fun findByIdAndOwnerId(id: UUID, ownerId: UUID): ThreadEntity?

        @Query(
                """
        select distinct t from ThreadEntity t
        left join t.categories c
        left join EntryEntity e on e.thread = t
        where t.ownerId = :ownerId
          and t.isHidden = false
          and (
            coalesce(:categoryIds, null) is null
            or c.id in :categoryIds
            or (:includeUncategorized = true and t.categories is empty)
          )
          and (
            lower(t.title) like lower(concat('%', :query, '%')) or
            lower(t.body) like lower(concat('%', :query, '%')) or
            (e.isHidden = false and lower(e.body) like lower(concat('%', :query, '%')))
          )
        order by t.isPinned desc, t.lastActivityAt desc
        """,
        )
        fun searchVisibleThreads(
                @Param("ownerId") ownerId: UUID,
                @Param("query") query: String,
                @Param("categoryIds") categoryIds: List<java.util.UUID>?,
                @Param("includeUncategorized") includeUncategorized: Boolean,
                pageable: Pageable,
        ): Slice<ThreadEntity>

        @Query(
                """
        select distinct t from ThreadEntity t
        left join t.categories c
        left join EntryEntity e on e.thread = t
        where t.ownerId = :ownerId
          and t.isHidden = true
          and (
            coalesce(:categoryIds, null) is null
            or c.id in :categoryIds
            or (:includeUncategorized = true and t.categories is empty)
          )
          and (
            lower(t.title) like lower(concat('%', :query, '%')) or
            lower(t.body) like lower(concat('%', :query, '%')) or
            lower(e.body) like lower(concat('%', :query, '%'))
          )
        order by t.isPinned desc, t.lastActivityAt desc
        """,
        )
        fun searchHiddenThreads(
                @Param("ownerId") ownerId: UUID,
                @Param("query") query: String,
                @Param("categoryIds") categoryIds: List<java.util.UUID>?,
                @Param("includeUncategorized") includeUncategorized: Boolean,
                pageable: Pageable,
        ): Slice<ThreadEntity>

        @Query(
                """
        select count(t.id)
        from ThreadEntity t
        where t.ownerId = :ownerId
          and t.isHidden = false
          and t.categories is empty
        """,
        )
        fun countUncategorizedThreads(
                @Param("ownerId") ownerId: UUID,
        ): Long
}
