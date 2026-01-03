package com.thredge.backend.domain.repository

import com.thredge.backend.domain.entity.EntryEntity
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Slice
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EntryRepository : JpaRepository<EntryEntity, UUID> {
    fun findByThreadIdOrderByCreatedAtAsc(threadId: UUID): List<EntryEntity>
    fun findByThreadIdInOrderByCreatedAtAsc(threadIds: Collection<UUID>): List<EntryEntity>
    fun findByIsHiddenTrueOrderByCreatedAtAsc(): List<EntryEntity>
    fun findByThreadOwnerUsernameAndIsHiddenTrueOrderByCreatedAtAsc(
        ownerUsername: String,
        pageable: Pageable,
    ): Slice<EntryEntity>
    fun findByIdAndThreadOwnerUsername(id: UUID, ownerUsername: String): EntryEntity?

    @Query(
        """
        select e from EntryEntity e
        where e.isHidden = true
          and e.thread.ownerUsername = :ownerUsername
          and lower(e.body) like lower(concat('%', :query, '%'))
        order by e.createdAt asc
        """,
    )
    fun searchHiddenEntries(
        @Param("ownerUsername") ownerUsername: String,
        @Param("query") query: String,
        pageable: Pageable,
    ): Slice<EntryEntity>
}
