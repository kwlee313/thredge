package com.thredge.backend.service

import com.thredge.backend.api.dto.EntryDetail
import com.thredge.backend.api.dto.EntryMoveDirection
import com.thredge.backend.api.dto.EntryMovePosition
import com.thredge.backend.api.dto.EntryMoveRequest
import com.thredge.backend.api.dto.EntryMoveTargetRequest
import com.thredge.backend.api.dto.EntryUpdateRequest
import com.thredge.backend.api.dto.PageResponse
import com.thredge.backend.api.mapper.ThreadMapper
import com.thredge.backend.domain.entity.EntryEntity
import com.thredge.backend.domain.repository.EntryRepository
import com.thredge.backend.domain.repository.ThreadRepository
import com.thredge.backend.support.BadRequestException
import com.thredge.backend.support.IdParser
import com.thredge.backend.support.NotFoundException
import com.thredge.backend.support.UserSupport
import java.time.Instant
import java.util.UUID
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EntryService(
    private val entryRepository: EntryRepository,
    private val threadRepository: ThreadRepository,
    private val threadMapper: ThreadMapper,
    private val userSupport: UserSupport,
) {
    @Transactional(readOnly = true)
    fun listHidden(ownerUsername: String, pageable: Pageable): PageResponse<EntryDetail> {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val slice = entryRepository.findByThreadOwnerIdAndIsHiddenTrueOrderByCreatedAtAsc(ownerId, pageable)
        return PageResponse.from(slice.map(threadMapper::toEntryDetail))
    }

    @Transactional(readOnly = true)
    fun searchHidden(ownerUsername: String, query: String, pageable: Pageable): PageResponse<EntryDetail> {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val trimmedQuery = query.trim()
        val slice = entryRepository.searchHiddenEntries(ownerId, trimmedQuery, pageable)
        return PageResponse.from(slice.map(threadMapper::toEntryDetail))
    }

    @Transactional
    fun updateEntry(ownerUsername: String, id: String, request: EntryUpdateRequest): EntryDetail {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val entry = findEntry(id, ownerId)
        if (request.body != null) {
            entry.body = request.body.trim()
        }
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return threadMapper.toEntryDetail(saved)
    }

    @Transactional
    fun hideEntry(ownerUsername: String, id: String) {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val entry = findEntry(id, ownerId)
        entry.isHidden = true
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
    }

    @Transactional
    fun restoreEntry(ownerUsername: String, id: String): EntryDetail {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val entry = findEntry(id, ownerId, includeHidden = true)
        entry.isHidden = false
        val saved = entryRepository.save(entry)
        bumpThreadActivity(saved.thread?.id)
        return threadMapper.toEntryDetail(saved)
    }

    @Transactional
    fun moveEntry(ownerUsername: String, id: String, request: EntryMoveRequest): EntryDetail {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val entry = findEntry(id, ownerId)
        val threadId = entry.thread?.id ?: throw NotFoundException("Thread not found.")
        val entries =
            entryRepository.findByThreadIdOrderByOrderIndexAsc(threadId)
                .filter { !it.isHidden }
        val entryById = entries.mapNotNull { candidate ->
            val entryId = candidate.id ?: return@mapNotNull null
            entryId to candidate
        }.toMap()
        val childrenByParent = mutableMapOf<UUID, MutableList<EntryEntity>>()
        val roots = mutableListOf<EntryEntity>()
        entries.forEach { candidate ->
            val parentId = candidate.parentEntryId
            if (parentId != null && entryById.containsKey(parentId)) {
                childrenByParent.getOrPut(parentId) { mutableListOf() }.add(candidate)
            } else {
                roots.add(candidate)
            }
        }
        sortByOrderIndex(roots)
        childrenByParent.values.forEach { sortByOrderIndex(it) }

        val ordered = buildOrderedEntries(roots, childrenByParent, entries)
        val entryId = entry.id ?: return threadMapper.toEntryDetail(entry)
        val currentIndex = ordered.indexOfFirst { it.id == entryId }
        if (currentIndex == -1) {
            return threadMapper.toEntryDetail(entry)
        }
        val previous = ordered.getOrNull(currentIndex - 1)
        val next = ordered.getOrNull(currentIndex + 1)
        val originalParentId = entry.parentEntryId
        val originalOrderIndex = entry.orderIndex
        val originalStates =
            entries.mapNotNull { candidate ->
                val candidateId = candidate.id ?: return@mapNotNull null
                candidateId to (candidate.parentEntryId to candidate.orderIndex)
            }.toMap()

        val resolvedParentId = entry.parentEntryId?.takeIf { entryById.containsKey(it) }
        val children = childrenByParent[entryId].orEmpty()
        if (resolvedParentId != null && children.isNotEmpty()) {
            throw BadRequestException("Entries with replies cannot be moved.")
        }

        val isTopRoot = resolvedParentId == null && roots.firstOrNull()?.id == entryId
        val isBottomRoot = resolvedParentId == null && roots.lastOrNull()?.id == entryId
        val isTopReply =
            resolvedParentId != null &&
                childrenByParent[resolvedParentId]?.firstOrNull()?.id == entryId
        val isBottomReply =
            resolvedParentId != null &&
                childrenByParent[resolvedParentId]?.lastOrNull()?.id == entryId

        val updated =
            when (request.direction) {
                EntryMoveDirection.UP -> {
                    if (resolvedParentId != null && isTopReply) {
                        moveEntryToRootBeforeParent(
                            entry,
                            resolvedParentId,
                            entryById,
                            roots,
                            childrenByParent,
                        )
                    } else if (isTopRoot || previous == null) {
                        entry
                    } else {
                        moveEntryUnderTarget(
                            entry,
                            previous,
                            entryById,
                            childrenByParent,
                            roots,
                            placeAfter = false,
                        )
                    }
                }
                EntryMoveDirection.DOWN -> {
                    if (resolvedParentId != null && isBottomReply) {
                        val parentEntry = entryById[resolvedParentId]
                        if (parentEntry == null) {
                            entry
                        } else if (parentEntry.parentEntryId != null) {
                            moveEntryToParentSibling(
                                entry,
                                parentEntry,
                                entryById,
                                childrenByParent,
                                roots,
                            )
                        } else {
                            moveEntryToRootAfterParent(entry, parentEntry, roots, childrenByParent)
                        }
                    } else if (isBottomRoot || next == null) {
                        entry
                    } else {
                        moveEntryUnderTarget(
                            entry,
                            next,
                            entryById,
                            childrenByParent,
                            roots,
                            placeAfter = true,
                        )
                    }
                }
            }

        if (updated.parentEntryId == originalParentId && updated.orderIndex == originalOrderIndex) {
            return threadMapper.toEntryDetail(updated)
        }
        val changed =
            entries.filter { candidate ->
                val id = candidate.id ?: return@filter false
                val (prevParentId, prevOrderIndex) = originalStates[id] ?: return@filter true
                candidate.parentEntryId != prevParentId || candidate.orderIndex != prevOrderIndex
            }
        val saved = entryRepository.saveAll(changed)
        bumpThreadActivity(entry.thread?.id)
        val moved =
            saved.firstOrNull { it.id == entry.id }
                ?: entryRepository.findById(entryId).orElse(entry)
        return threadMapper.toEntryDetail(moved)
    }

    @Transactional
    fun moveEntryTo(ownerUsername: String, id: String, request: EntryMoveTargetRequest): EntryDetail {
        val ownerId = userSupport.requireUserId(ownerUsername)
        val entry = findEntry(id, ownerId)
        val threadId = entry.thread?.id ?: throw NotFoundException("Thread not found.")
        val entries =
            entryRepository.findByThreadIdOrderByOrderIndexAsc(threadId)
                .filter { !it.isHidden }
        val entryById = entries.mapNotNull { candidate ->
            val entryId = candidate.id ?: return@mapNotNull null
            entryId to candidate
        }.toMap()
        val childrenByParent = mutableMapOf<UUID, MutableList<EntryEntity>>()
        val roots = mutableListOf<EntryEntity>()
        entries.forEach { candidate ->
            val parentId = candidate.parentEntryId
            if (parentId != null && entryById.containsKey(parentId)) {
                childrenByParent.getOrPut(parentId) { mutableListOf() }.add(candidate)
            } else {
                roots.add(candidate)
            }
        }
        sortByOrderIndex(roots)
        childrenByParent.values.forEach { sortByOrderIndex(it) }

        val entryId = entry.id ?: return threadMapper.toEntryDetail(entry)
        val targetId = IdParser.parseUuid(request.targetEntryId, "Invalid target entry id.")
        val target = entryById[targetId] ?: throw NotFoundException("Target entry not found.")
        if (targetId == entryId) {
            return threadMapper.toEntryDetail(entry)
        }
        val resolvedParentId = entry.parentEntryId?.takeIf { entryById.containsKey(it) }
        val children = childrenByParent[entryId].orEmpty()
        if (resolvedParentId != null && children.isNotEmpty()) {
            throw BadRequestException("Entries with replies cannot be moved.")
        }
        if (isDescendant(targetId, entryId, childrenByParent)) {
            throw BadRequestException("Invalid move target.")
        }

        val originalParentId = entry.parentEntryId
        val originalOrderIndex = entry.orderIndex
        val originalStates =
            entries.mapNotNull { candidate ->
                val candidateId = candidate.id ?: return@mapNotNull null
                candidateId to (candidate.parentEntryId to candidate.orderIndex)
            }.toMap()

        val targetParentId =
            if (request.position == EntryMovePosition.CHILD) {
                targetId
            } else {
                target.parentEntryId?.takeIf { entryById.containsKey(it) }
            }
        val subtreeDepth = resolveSubtreeDepth(entryId, childrenByParent)
        val parentDepth =
            if (targetParentId == null) {
                0
            } else {
                resolveDepth(targetParentId, entryById)
            }
        if (parentDepth + subtreeDepth > 3) {
            throw BadRequestException("Reply depth limit reached.")
        }

        removeFromParent(entry, originalParentId, roots, childrenByParent)
        entry.parentEntryId = targetParentId
        val targetList =
            if (targetParentId == null) {
                roots
            } else {
                childrenByParent.getOrPut(targetParentId) { mutableListOf() }
            }
        val targetIndex = targetList.indexOfFirst { it.id == targetId }
        val insertIndex =
            if (request.position == EntryMovePosition.CHILD) {
                0
            } else if (targetIndex == -1) {
                targetList.size
            } else if (request.position == EntryMovePosition.BEFORE) {
                targetIndex
            } else {
                targetIndex + 1
            }
        insertWithOrderIndex(targetList, entry, insertIndex)

        if (entry.parentEntryId == originalParentId && entry.orderIndex == originalOrderIndex) {
            return threadMapper.toEntryDetail(entry)
        }
        val changed =
            entries.filter { candidate ->
                val candidateId = candidate.id ?: return@filter false
                val (prevParentId, prevOrderIndex) = originalStates[candidateId] ?: return@filter true
                candidate.parentEntryId != prevParentId || candidate.orderIndex != prevOrderIndex
            }
        val saved = entryRepository.saveAll(changed)
        bumpThreadActivity(entry.thread?.id)
        val moved =
            saved.firstOrNull { it.id == entry.id }
                ?: entryRepository.findById(entryId).orElse(entry)
        return threadMapper.toEntryDetail(moved)
    }

    private fun findEntry(
        id: String,
        ownerId: UUID,
        includeHidden: Boolean = false,
    ): EntryEntity {
        val uuid = IdParser.parseUuid(id, "Invalid entry id.")
        val entry =
            entryRepository.findByIdAndThreadOwnerId(uuid, ownerId)
                ?: throw NotFoundException("Entry not found.")
        if (entry.isHidden && !includeHidden) {
            throw NotFoundException("Entry not found.")
        }
        return entry
    }

    private fun bumpThreadActivity(threadId: UUID?) {
        if (threadId == null) {
            return
        }
        val thread = threadRepository.findById(threadId).orElse(null) ?: return
        thread.lastActivityAt = Instant.now()
        threadRepository.save(thread)
    }

    private fun buildOrderedEntries(
        roots: List<EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
        entries: List<EntryEntity>,
    ): List<EntryEntity> {
        if (entries.isEmpty()) {
            return emptyList()
        }
        val ordered = mutableListOf<EntryEntity>()
        val visited = mutableSetOf<UUID>()
        fun walk(entry: EntryEntity) {
            val id = entry.id ?: return
            if (!visited.add(id)) {
                return
            }
            ordered.add(entry)
            val children = childrenByParent[id] ?: return
            children.forEach(::walk)
        }
        roots.forEach(::walk)
        entries.forEach { candidate ->
            val id = candidate.id ?: return@forEach
            if (!visited.contains(id)) {
                walk(candidate)
            }
        }
        return ordered
    }

    private fun sortByOrderIndex(entries: MutableList<EntryEntity>) {
        entries.sortWith(
            compareBy<EntryEntity> { it.orderIndex }
                .thenBy { it.createdAt }
                .thenBy { it.id.toString() },
        )
    }

    private fun normalizeOrder(entries: MutableList<EntryEntity>) {
        entries.forEachIndexed { index, item ->
            item.orderIndex = (index + 1) * 1000L
        }
    }

    private fun insertWithOrderIndex(
        entries: MutableList<EntryEntity>,
        entry: EntryEntity,
        index: Int,
    ) {
        val safeIndex = index.coerceIn(0, entries.size)
        entries.add(safeIndex, entry)
        val prev = entries.getOrNull(safeIndex - 1)
        val next = entries.getOrNull(safeIndex + 1)
        entry.orderIndex =
            when {
                prev == null && next == null -> 1000L
                prev == null -> (next?.orderIndex ?: 0L) - 1000L
                next == null -> prev.orderIndex + 1000L
                else -> {
                    val gap = next.orderIndex - prev.orderIndex
                    if (gap > 1) {
                        prev.orderIndex + gap / 2
                    } else {
                        normalizeOrder(entries)
                        entries[safeIndex].orderIndex
                    }
                }
            }
    }

    private fun removeFromParent(
        entry: EntryEntity,
        parentId: UUID?,
        roots: MutableList<EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
    ) {
        val list =
            if (parentId == null) {
                roots
            } else {
                childrenByParent[parentId]
            }
        list?.removeAll { it.id == entry.id }
    }

    private fun moveEntryToRootBeforeParent(
        entry: EntryEntity,
        parentId: UUID,
        entryById: Map<UUID, EntryEntity>,
        roots: MutableList<EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
    ): EntryEntity {
        val parentRootId = resolveRootAncestorId(parentId, entryById) ?: parentId
        val parentRootIndex = roots.indexOfFirst { it.id == parentRootId }
        if (parentRootIndex == -1) {
            return entry
        }
        val previousParentId = entry.parentEntryId
        removeFromParent(entry, previousParentId, roots, childrenByParent)
        entry.parentEntryId = null
        insertWithOrderIndex(roots, entry, parentRootIndex)
        return entry
    }

    private fun moveEntryToRootAfterParent(
        entry: EntryEntity,
        parentEntry: EntryEntity,
        roots: MutableList<EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
    ): EntryEntity {
        val parentIndex = roots.indexOfFirst { it.id == parentEntry.id }
        if (parentIndex == -1) {
            return entry
        }
        val previousParentId = entry.parentEntryId
        removeFromParent(entry, previousParentId, roots, childrenByParent)
        entry.parentEntryId = null
        insertWithOrderIndex(roots, entry, parentIndex + 1)
        return entry
    }

    private fun moveEntryUnderTarget(
        entry: EntryEntity,
        target: EntryEntity,
        entryById: Map<UUID, EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
        roots: MutableList<EntryEntity>,
        placeAfter: Boolean,
    ): EntryEntity {
        val entryId = entry.id ?: return entry
        val targetId = target.id ?: return entry
        if (isDescendant(targetId, entryId, childrenByParent)) {
            throw BadRequestException("Invalid move target.")
        }
        val targetRootId = resolveRootAncestorId(targetId, entryById) ?: targetId
        if (isDescendant(targetRootId, entryId, childrenByParent)) {
            throw BadRequestException("Invalid move target.")
        }
        val parentDepth = resolveDepth(targetRootId, entryById)
        val subtreeDepth = resolveSubtreeDepth(entryId, childrenByParent)
        if (parentDepth + subtreeDepth > 3) {
            throw BadRequestException("Reply depth limit reached.")
        }
        val previousParentId = entry.parentEntryId
        removeFromParent(entry, previousParentId, roots, childrenByParent)
        entry.parentEntryId = targetRootId
        val targetChildren =
            childrenByParent.getOrPut(targetRootId) { mutableListOf() }
        if (targetRootId == targetId) {
            if (placeAfter) {
                insertWithOrderIndex(targetChildren, entry, targetChildren.size)
            } else {
                insertWithOrderIndex(targetChildren, entry, 0)
            }
        } else {
            val targetIndex = targetChildren.indexOfFirst { it.id == targetId }
            if (targetIndex == -1) {
                if (placeAfter) {
                    insertWithOrderIndex(targetChildren, entry, targetChildren.size)
                } else {
                    insertWithOrderIndex(targetChildren, entry, 0)
                }
            } else {
                val insertIndex = if (placeAfter) targetIndex + 1 else targetIndex
                insertWithOrderIndex(targetChildren, entry, insertIndex)
            }
        }
        return entry
    }

    private fun resolveDepth(
        entryId: UUID,
        entryById: Map<UUID, EntryEntity>,
    ): Int {
        var depth = 1
        var currentId: UUID? = entryId
        val visited = mutableSetOf<UUID>()
        while (currentId != null) {
            if (!visited.add(currentId)) {
                throw BadRequestException("Invalid reply chain.")
            }
            val entry = entryById[currentId] ?: break
            currentId = entry.parentEntryId
            if (currentId != null) {
                depth += 1
            }
            if (depth > 3) {
                break
            }
        }
        return depth
    }

    private fun resolveSubtreeDepth(
        entryId: UUID,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
    ): Int {
        val children = childrenByParent[entryId] ?: return 1
        val childDepths =
            children.mapNotNull { child ->
                val id = child.id ?: return@mapNotNull null
                resolveSubtreeDepth(id, childrenByParent)
            }
        val maxChildDepth = childDepths.maxOrNull() ?: 0
        return 1 + maxChildDepth
    }

    private fun resolveRootAncestorId(
        entryId: UUID,
        entryById: Map<UUID, EntryEntity>,
    ): UUID? {
        var currentId: UUID? = entryId
        var rootId: UUID? = null
        val visited = mutableSetOf<UUID>()
        while (currentId != null) {
            if (!visited.add(currentId)) {
                throw BadRequestException("Invalid reply chain.")
            }
            val entry = entryById[currentId] ?: break
            rootId = currentId
            currentId = entry.parentEntryId
        }
        return rootId
    }

    private fun moveEntryToParentSibling(
        entry: EntryEntity,
        parentEntry: EntryEntity,
        entryById: Map<UUID, EntryEntity>,
        childrenByParent: MutableMap<UUID, MutableList<EntryEntity>>,
        roots: MutableList<EntryEntity>,
    ): EntryEntity {
        val grandparentId = parentEntry.parentEntryId ?: return entry
        val entryId = entry.id ?: return entry
        val parentDepth = resolveDepth(grandparentId, entryById)
        val subtreeDepth = resolveSubtreeDepth(entryId, childrenByParent)
        if (parentDepth + subtreeDepth > 3) {
            throw BadRequestException("Reply depth limit reached.")
        }
        val previousParentId = entry.parentEntryId
        removeFromParent(entry, previousParentId, roots, childrenByParent)
        entry.parentEntryId = grandparentId
        val siblings =
            childrenByParent.getOrPut(grandparentId) { mutableListOf() }
        val parentIndex = siblings.indexOfFirst { it.id == parentEntry.id }
        if (parentIndex == -1) {
            insertWithOrderIndex(siblings, entry, siblings.size)
        } else {
            insertWithOrderIndex(siblings, entry, parentIndex + 1)
        }
        return entry
    }

    private fun isDescendant(
        candidateId: UUID,
        ancestorId: UUID,
        childrenByParent: Map<UUID, MutableList<EntryEntity>>,
    ): Boolean {
        val children = childrenByParent[ancestorId] ?: return false
        val queue = ArrayDeque(children.mapNotNull { it.id })
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            if (current == candidateId) {
                return true
            }
            childrenByParent[current]?.forEach { child ->
                val childId = child.id ?: return@forEach
                queue.addLast(childId)
            }
        }
        return false
    }
}
