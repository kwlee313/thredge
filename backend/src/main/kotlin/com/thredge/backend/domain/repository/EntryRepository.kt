package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.EntryEntity
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Slice
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EntryRepository : JpaRepository<EntryEntity, UUID> {
    fun findByThreadIdOrderByOrderIndexAsc(threadId: UUID): List<EntryEntity>
    fun findByThreadIdInOrderByOrderIndexAsc(threadIds: Collection<UUID>): List<EntryEntity>
    fun findByIsHiddenTrueOrderByCreatedAtAsc(): List<EntryEntity>
    fun findByThreadOwnerIdAndIsHiddenTrueOrderByCreatedAtAsc(
        ownerId: UUID,
        pageable: Pageable,
    ): Slice<EntryEntity>
    fun findByIdAndThreadOwnerId(id: UUID, ownerId: UUID): EntryEntity?

    @Query(
        """
        select max(e.orderIndex) from EntryEntity e
        where e.thread.id = :threadId
          and ((:parentId is null and e.parentEntryId is null) or e.parentEntryId = :parentId)
        """,
    )
    fun findMaxOrderIndex(
        @Param("threadId") threadId: UUID,
        @Param("parentId") parentId: UUID?,
    ): Long?

    @Query(
        """
        select e from EntryEntity e
        where e.isHidden = true
          and e.thread.ownerId = :ownerId
          and lower(e.body) like lower(concat('%', :query, '%'))
        order by e.createdAt asc
        """,
    )
    fun searchHiddenEntries(
        @Param("ownerId") ownerId: UUID,
        @Param("query") query: String,
        pageable: Pageable,
    ): Slice<EntryEntity>
}
