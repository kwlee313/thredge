package com.thredge.backend.api.dto

import org.springframework.data.domain.Slice

data class PageResponse<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val hasNext: Boolean,
) {
    companion object {
        fun <T> from(slice: Slice<T>): PageResponse<T> =
            PageResponse(
                items = slice.content,
                page = slice.number,
                size = slice.size,
                hasNext = slice.hasNext(),
            )
    }
}
